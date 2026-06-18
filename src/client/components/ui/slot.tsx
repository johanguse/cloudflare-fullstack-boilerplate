import * as React from "react";

type SlotProps = React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode;
};

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
	return (node: T) => {
		for (const ref of refs) {
			if (typeof ref === "function") {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		}
	};
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(
	({ children, className, ...props }, ref) => {
		if (!React.isValidElement(children)) {
			return null;
		}

		const child = children as React.ReactElement<{
			className?: string;
			ref?: React.Ref<HTMLElement>;
		}>;

		return React.cloneElement(child, {
			...props,
			...child.props,
			className: [className, child.props.className].filter(Boolean).join(" "),
			ref: composeRefs(ref, child.props.ref),
		});
	},
);

Slot.displayName = "Slot";

export { Slot };
