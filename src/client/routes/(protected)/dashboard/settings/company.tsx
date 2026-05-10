import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import { Alert, AlertDescription } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/settings/company")(
	{
		component: CompanySettingsPage,
	},
);

function CompanySettingsPage() {
	const settingsQuery = trpc.nfse.getSettings.useQuery();
	const updateMutation = trpc.nfse.updateSettings.useMutation({
		onSuccess: () => {
			toast.success("Company settings saved");
			settingsQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const [form, setForm] = useState({
		cnpj: "",
		razaoSocial: "",
		inscricaoMunicipal: "",
		nomeFantasia: "",
		street: "",
		number: "",
		complement: "",
		neighborhood: "",
		city: "",
		state: "",
		zipCode: "",
		cityCode: "",
		serviceDescription: "",
		cnaeCode: "",
		issRate: "",
		municipalityCode: "",
	});

	useEffect(() => {
		if (settingsQuery.data) {
			const s = settingsQuery.data;
			setForm({
				cnpj: s.cnpj ?? "",
				razaoSocial: s.razaoSocial ?? "",
				inscricaoMunicipal: s.inscricaoMunicipal ?? "",
				nomeFantasia: s.nomeFantasia ?? "",
				street: s.street ?? "",
				number: s.number ?? "",
				complement: s.complement ?? "",
				neighborhood: s.neighborhood ?? "",
				city: s.city ?? "",
				state: s.state ?? "",
				zipCode: s.zipCode ?? "",
				cityCode: s.cityCode?.toString() ?? "",
				serviceDescription: s.serviceDescription ?? "",
				cnaeCode: s.cnaeCode ?? "",
				issRate: s.issRate != null ? (s.issRate / 100).toFixed(2) : "",
				municipalityCode: s.municipalityCode ?? "",
			});
		}
	}, [settingsQuery.data]);

	function handleChange(field: keyof typeof form, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const cityCodeNum = form.cityCode
			? Number.parseInt(form.cityCode, 10)
			: undefined;
		const issRateNum = form.issRate
			? Math.round(Number.parseFloat(form.issRate) * 100)
			: undefined;

		updateMutation.mutate({
			cnpj: form.cnpj ?? undefined,
			razaoSocial: form.razaoSocial ?? undefined,
			inscricaoMunicipal: form.inscricaoMunicipal ?? undefined,
			nomeFantasia: form.nomeFantasia ?? undefined,
			street: form.street ?? undefined,
			number: form.number ?? undefined,
			complement: form.complement ?? undefined,
			neighborhood: form.neighborhood ?? undefined,
			city: form.city ?? undefined,
			state: form.state ?? undefined,
			zipCode: form.zipCode ?? undefined,
			cityCode: cityCodeNum,
			serviceDescription: form.serviceDescription ?? undefined,
			cnaeCode: form.cnaeCode ?? undefined,
			issRate: issRateNum,
			municipalityCode: form.municipalityCode ?? undefined,
		});
	}

	if (settingsQuery.isPending) {
		return (
			<DashboardLayout>
				<div className="max-w-2xl space-y-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-96 w-full" />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="max-w-2xl space-y-6">
				<div className="flex items-center gap-3">
					<Building2 className="h-6 w-6 text-muted-foreground" />
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							Company Settings
						</h1>
						<p className="text-muted-foreground text-sm">
							Fiscal data required for NFSe (Nota Fiscal de Serviço Eletrônica)
							emission
						</p>
					</div>
				</div>

				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						These settings are used to emit NFSe for every paid invoice. Contact
						your accountant for the correct CNPJ, Inscrição Municipal, and CNAE
						code.
					</AlertDescription>
				</Alert>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Fiscal Identity */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Fiscal Identity</CardTitle>
							<CardDescription>
								Legal identification of your company as the service provider
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="cnpj">CNPJ *</Label>
								<Input
									id="cnpj"
									value={form.cnpj}
									onChange={(e) => handleChange("cnpj", e.target.value)}
									placeholder="12.345.678/0001-99"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="inscricaoMunicipal">
									Inscrição Municipal *
								</Label>
								<Input
									id="inscricaoMunicipal"
									value={form.inscricaoMunicipal}
									onChange={(e) =>
										handleChange("inscricaoMunicipal", e.target.value)
									}
									placeholder="12345678"
								/>
							</div>
							<div className="col-span-2 space-y-1.5">
								<Label htmlFor="razaoSocial">Razão Social *</Label>
								<Input
									id="razaoSocial"
									value={form.razaoSocial}
									onChange={(e) => handleChange("razaoSocial", e.target.value)}
									placeholder="Empresa Exemplo LTDA"
								/>
							</div>
							<div className="col-span-2 space-y-1.5">
								<Label htmlFor="nomeFantasia">Nome Fantasia</Label>
								<Input
									id="nomeFantasia"
									value={form.nomeFantasia}
									onChange={(e) => handleChange("nomeFantasia", e.target.value)}
									placeholder="Optional trade name"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Address */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Address</CardTitle>
							<CardDescription>
								Company address as registered with the tax authority
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-4">
							<div className="col-span-2 space-y-1.5">
								<Label htmlFor="street">Street</Label>
								<Input
									id="street"
									value={form.street}
									onChange={(e) => handleChange("street", e.target.value)}
									placeholder="Rua das Flores"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="number">Number</Label>
								<Input
									id="number"
									value={form.number}
									onChange={(e) => handleChange("number", e.target.value)}
									placeholder="123"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="complement">Complement</Label>
								<Input
									id="complement"
									value={form.complement}
									onChange={(e) => handleChange("complement", e.target.value)}
									placeholder="Sala 45"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="neighborhood">Neighborhood</Label>
								<Input
									id="neighborhood"
									value={form.neighborhood}
									onChange={(e) => handleChange("neighborhood", e.target.value)}
									placeholder="Centro"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="zipCode">CEP</Label>
								<Input
									id="zipCode"
									value={form.zipCode}
									onChange={(e) => handleChange("zipCode", e.target.value)}
									placeholder="01310-100"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="city">City</Label>
								<Input
									id="city"
									value={form.city}
									onChange={(e) => handleChange("city", e.target.value)}
									placeholder="São Paulo"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="state">State</Label>
								<Input
									id="state"
									value={form.state}
									onChange={(e) => handleChange("state", e.target.value)}
									placeholder="SP"
									maxLength={2}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Service Defaults */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Service Defaults</CardTitle>
							<CardDescription>
								Default values used when emitting NFSe — can be overridden per
								invoice
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-4">
							<div className="col-span-2 space-y-1.5">
								<Label htmlFor="serviceDescription">
									Service Description *
								</Label>
								<Input
									id="serviceDescription"
									value={form.serviceDescription}
									onChange={(e) =>
										handleChange("serviceDescription", e.target.value)
									}
									placeholder="Desenvolvimento de software sob demanda"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="cnaeCode">CNAE Code *</Label>
								<Input
									id="cnaeCode"
									value={form.cnaeCode}
									onChange={(e) => handleChange("cnaeCode", e.target.value)}
									placeholder="6201-5/01"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="issRate">ISS Rate (%)</Label>
								<Input
									id="issRate"
									type="number"
									min={0}
									max={5}
									step="0.01"
									value={form.issRate}
									onChange={(e) => handleChange("issRate", e.target.value)}
									placeholder="2.00"
								/>
							</div>

							<Separator className="col-span-2" />

							<div className="space-y-1.5">
								<Label htmlFor="cityCode">City IBGE Code *</Label>
								<Input
									id="cityCode"
									type="number"
									value={form.cityCode}
									onChange={(e) => handleChange("cityCode", e.target.value)}
									placeholder="3550308"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="municipalityCode">Municipality Code</Label>
								<Input
									id="municipalityCode"
									value={form.municipalityCode}
									onChange={(e) =>
										handleChange("municipalityCode", e.target.value)
									}
									placeholder="Optional — from Fiscal Nacional portal"
								/>
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? "Saving…" : "Save settings"}
						</Button>
					</div>
				</form>
			</div>
		</DashboardLayout>
	);
}
