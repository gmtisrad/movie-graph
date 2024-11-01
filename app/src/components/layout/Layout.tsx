import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "../../common/types";
import { SideNav, SideNavTrigger } from "./SideNav";

export const Layout = (): FunctionComponent => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
			<SideNavTrigger isOpen={isOpen} onClick={() => setIsOpen(true)} />
			<SideNav isOpen={isOpen} onClose={() => setIsOpen(false)} />
			<main>
				<Outlet />
			</main>
		</div>
	);
};
