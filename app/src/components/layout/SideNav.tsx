import type { FC } from "react";
import { HiMenu, HiX } from "react-icons/hi";

interface ISideNavProps {
	isOpen: boolean;
	onClose: () => void;
}

export const SideNav: FC<ISideNavProps> = ({ isOpen, onClose }) => {
	return (
		<div
			className={`fixed top-0 left-0 h-full bg-gray-800 dark:bg-gray-950 text-white transition-all duration-300 ${
				isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"
			}`}
		>
			<div className="flex items-center justify-between p-4 border-b border-gray-700 dark:border-gray-800">
				<h2 className="text-xl font-bold">Menu</h2>
				<button
					className="p-2 rounded-full hover:bg-gray-700 dark:hover:bg-gray-800"
					onClick={onClose}
				>
					<HiX className="w-6 h-6" />
				</button>
			</div>
			<nav className="p-4">
				<ul className="space-y-2">
					<li>
						<a
							href="/"
							className="block p-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800"
						>
							Home
						</a>
					</li>
					<li>
						<a
							href="/about"
							className="block p-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800"
						>
							About
						</a>
					</li>
					<li>
						<a
							href="/contact"
							className="block p-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800"
						>
							Contact
						</a>
					</li>
				</ul>
			</nav>
		</div>
	);
};

interface ISideNavTriggerProps {
	isOpen: boolean;
	onClick: () => void;
}

export const SideNavTrigger: FC<ISideNavTriggerProps> = ({
	isOpen,
	onClick,
}) => {
	return (
		<button
			onClick={onClick}
			className={`fixed top-4 left-4 p-3 rounded-full bg-gray-800 dark:bg-gray-950 text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-opacity duration-300 ${
				isOpen ? "opacity-0" : "opacity-100"
			}`}
			aria-label="Open menu"
		>
			<HiMenu className="w-6 h-6" />
		</button>
	);
};
