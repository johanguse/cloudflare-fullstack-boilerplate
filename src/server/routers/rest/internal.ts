// ---------------------------------------------------------------------------
// Internal REST API — used exclusively by Trigger.dev tasks
//
// All routes are protected by INTERNAL_API_KEY bearer token.
// Never expose these routes publicly or to the dashboard SPA.
// ---------------------------------------------------------------------------

import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import * as invoiceSchema from "../../db/schema/invoices";
import * as nfseSchema from "../../db/schema/nfse";
import { createAppConfig } from "../../lib/config";
import type { AppBindings } from "../../lib/types";
import { sendNfseIssuedEmail } from "../../services/email";
import {
	getFiscalNacionalService,
	storeNfsePdf,
	storeNfseXml,
} from "../../services/nfse";
import { getNotificationPrefs } from "../../services/notification-prefs";

export const internalRouter = new Hono<AppBindings>();

// ---------------------------------------------------------------------------
// Auth middleware — validates INTERNAL_API_KEY on every request
// ---------------------------------------------------------------------------

internalRouter.use("*", async (c, next) => {
	const authHeader = c.req.header("Authorization");
	const token = authHeader?.replace(/^Bearer\s+/i, "");

	const timingSafeEqual = async (a: string, b: string): Promise<boolean> => {
		const enc = new TextEncoder();
		const aBytes = enc.encode(a);
		const bBytes = enc.encode(b);
		if (aBytes.length !== bBytes.length) return false;
		const [aKey, bKey] = await Promise.all([
			crypto.subtle.importKey("raw", aBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
			crypto.subtle.importKey("raw", bBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
		]);
		const [aSig, bSig] = await Promise.all([
			crypto.subtle.sign("HMAC", aKey, aBytes),
			crypto.subtle.sign("HMAC", bKey, bBytes),
		]);
		return (
			aSig.byteLength === bSig.byteLength &&
			new Uint8Array(aSig).every((byte, i) => byte === new Uint8Array(bSig)[i])
		);
	};

	if (!token || !(await timingSafeEqual(token, c.env.INTERNAL_API_KEY))) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return next();
});

// ---------------------------------------------------------------------------
// GET /api/internal/nfse/invoice-data/:invoiceId
// Returns invoice + optional user service description defaults
// ---------------------------------------------------------------------------

internalRouter.get("/api/internal/nfse/invoice-data/:invoiceId", async (c) => {
	const db = c.get("db");
	const invoiceId = c.req.param("invoiceId");

	const invoice = await db
		.select()
		.from(invoiceSchema.invoices)
		.where(eq(invoiceSchema.invoices.id, invoiceId))
		.get();

	if (!invoice) {
		return c.json({ error: "Invoice not found" }, 404);
	}

	const settings = await db
		.select()
		.from(nfseSchema.companySettings)
		.where(eq(nfseSchema.companySettings.userId, invoice.userId))
		.get();

	return c.json({
		invoice,
		serviceDescription: settings?.serviceDescription ?? null,
		productName: settings?.productName ?? null,
	});
});

// ---------------------------------------------------------------------------
// POST /api/internal/nfse/emit
// Calls Fiscal Nacional External API to emit an NFSe
// ---------------------------------------------------------------------------

internalRouter.post("/api/internal/nfse/emit", async (c) => {
	type EmitBody = {
		nfseRecordId: string;
		invoice: {
			id: string;
			amountTotal: number;
			customerName: string | null;
			customerEmail: string | null;
			customerDocument: string | null;
			description: string | null;
		};
		serviceDescription: string | null;
		productName: string | null;
	};

	const body = await c.req.json<EmitBody>();
	const { nfseRecordId, invoice, serviceDescription, productName } = body;

	const environment =
		(c.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production" | undefined) ?? "staging";
	const service = getFiscalNacionalService(c.env.FISCAL_NACIONAL_API_KEY, environment);

	const result = await service.emitNfse({
		customerName: invoice.customerName ?? "Customer",
		customerEmail: invoice.customerEmail ?? undefined,
		customerDocument: invoice.customerDocument ?? undefined,
		serviceDescription: invoice.description ?? serviceDescription ?? undefined,
		productName: productName ?? undefined,
		amount: invoice.amountTotal / 100,
		externalReference: `invoice-${invoice.id}`,
	});

	const db = c.get("db");
	await db
		.update(nfseSchema.nfseRecords)
		.set({
			fiscalNacionalId: result.fiscalNacionalId,
			fiscalNacionalReference: result.fiscalNacionalReference,
			status: result.status === "issued" || result.status === "invoice_only"
				? result.status
				: "processing",
			nfseNumber: result.nfseNumber,
			pdfUrl: result.pdfUrl,
			xmlUrl: result.xmlUrl,
			invoiceUrl: result.invoiceUrl,
			updatedAt: new Date(),
		})
		.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));

	return c.json({
		fiscalNacionalId: result.fiscalNacionalId,
		fiscalNacionalReference: result.fiscalNacionalReference,
		status: result.status,
	});
});

// ---------------------------------------------------------------------------
// GET /api/internal/nfse/status/:reference
// Polls Fiscal Nacional for NFSe status by reference
// ---------------------------------------------------------------------------

internalRouter.get("/api/internal/nfse/status/:reference", async (c) => {
	const reference = c.req.param("reference");
	const environment =
		(c.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production" | undefined) ?? "staging";
	const service = getFiscalNacionalService(c.env.FISCAL_NACIONAL_API_KEY, environment);

	const result = await service.getNfseStatus(reference);
	return c.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/internal/nfse/update/:nfseRecordId
// Updates nfse_records row with latest status
// ---------------------------------------------------------------------------

internalRouter.post("/api/internal/nfse/update/:nfseRecordId", async (c) => {
	type UpdateBody = {
		status: "pending" | "processing" | "issued" | "error" | "cancelled" | "invoice_only";
		nfseNumber?: string;
		pdfUrl?: string;
		xmlUrl?: string;
		invoiceUrl?: string;
		errorMessage?: string;
		issuedAt?: string;
	};

	const db = c.get("db");
	const nfseRecordId = c.req.param("nfseRecordId");
	const body = await c.req.json<UpdateBody>();

	await db
		.update(nfseSchema.nfseRecords)
		.set({
			status: body.status,
			nfseNumber: body.nfseNumber,
			pdfUrl: body.pdfUrl,
			xmlUrl: body.xmlUrl,
			invoiceUrl: body.invoiceUrl,
			errorMessage: body.errorMessage,
			emittedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
			updatedAt: new Date(),
		})
		.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));

	if (body.status === "issued") {
		c.executionCtx.waitUntil(
			(async () => {
				try {
					const rec = await db
						.select()
						.from(nfseSchema.nfseRecords)
						.where(eq(nfseSchema.nfseRecords.id, nfseRecordId))
						.get();
					if (!rec?.invoiceId) return;

					const invoice = await db
						.select()
						.from(invoiceSchema.invoices)
						.where(eq(invoiceSchema.invoices.id, rec.invoiceId))
						.get();
					if (!invoice?.customerEmail) return;

					const prefs = await getNotificationPrefs(db, invoice.userId);
					if (!prefs.notifyNfseIssued) return;

					const config = createAppConfig(c.env);
					await sendNfseIssuedEmail(c.env, config, invoice.customerEmail, {
						invoiceNumber: invoice.number,
						nfseNumber: body.nfseNumber,
						pdfUrl: body.pdfUrl,
						xmlUrl: body.xmlUrl,
					});
				} catch (e) {
					console.error("[email] nfse issued notify failed", e);
				}
			})(),
		);
	}

	return c.json({ updated: true });
});

// ---------------------------------------------------------------------------
// POST /api/internal/nfse/store-files/:nfseRecordId
// Downloads PDF/XML from Fiscal Nacional and stores them in R2
// ---------------------------------------------------------------------------

internalRouter.post("/api/internal/nfse/store-files/:nfseRecordId", async (c) => {
	type StoreBody = {
		reference: string;
		pdfUrl?: string;
		xmlUrl?: string;
	};

	const db = c.get("db");
	const nfseRecordId = c.req.param("nfseRecordId");
	const body = await c.req.json<StoreBody>();

	const r2Updates: Partial<typeof nfseSchema.nfseRecords.$inferInsert> = {};

	if (body.pdfUrl) {
		try {
			const pdfRes = await fetch(body.pdfUrl);
			if (pdfRes.ok) {
				const r2Key = await storeNfsePdf(c.env.STORAGE, nfseRecordId, await pdfRes.arrayBuffer());
				r2Updates.pdfR2Key = r2Key;
			}
		} catch {
			// Non-fatal — external URL still accessible
		}
	}

	if (body.xmlUrl) {
		try {
			const xmlRes = await fetch(body.xmlUrl);
			if (xmlRes.ok) {
				const r2Key = await storeNfseXml(c.env.STORAGE, nfseRecordId, await xmlRes.text());
				r2Updates.xmlR2Key = r2Key;
			}
		} catch {
			// Non-fatal
		}
	}

	if (Object.keys(r2Updates).length > 0) {
		await db
			.update(nfseSchema.nfseRecords)
			.set({ ...r2Updates, updatedAt: new Date() })
			.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
	}

	return c.json({ stored: true });
});

// ---------------------------------------------------------------------------
// POST /api/internal/nfse/create-record
// Creates the initial nfse_records row before triggering the task
// ---------------------------------------------------------------------------

internalRouter.post("/api/internal/nfse/create-record", async (c) => {
	type CreateBody = {
		invoiceId: string;
		userId: string;
	};

	const db = c.get("db");
	const body = await c.req.json<CreateBody>();
	const id = nanoid();

	await db.insert(nfseSchema.nfseRecords).values({
		id,
		invoiceId: body.invoiceId,
		userId: body.userId,
		status: "pending",
	});

	return c.json({ id });
});
