import { type FC, useEffect, useRef } from "react";
import { Graph } from "@cosmograph/cosmos";

interface Node {
	id: string;
	group: number;
}

interface Link {
	source: string;
	target: string;
	value: number;
}

const nodes: Array<Node> = [
	{ id: "Node 1", group: 1 },
	{ id: "Node 2", group: 1 },
	{ id: "Node 3", group: 2 },
	{ id: "Node 4", group: 2 },
	{ id: "Node 5", group: 3 },
];

const links: Array<Link> = [
	{ source: "Node 1", target: "Node 2", value: 1 },
	{ source: "Node 2", target: "Node 3", value: 1 },
	{ source: "Node 3", target: "Node 4", value: 1 },
	{ source: "Node 4", target: "Node 5", value: 1 },
	{ source: "Node 5", target: "Node 1", value: 1 },
];

export const CosmographComponent: FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const graphRef = useRef<Graph<Node, Link> | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		// Clear any existing canvas elements
		containerRef.current.innerHTML = "";

		const canvas = document.createElement("canvas");
		containerRef.current.appendChild(canvas);

		graphRef.current = new Graph(canvas, {
			backgroundColor: "#ffffff",
			nodeColor: "#2563eb",
			linkColor: "#94a3b8",
			simulation: {
				linkDistance: 10,
				linkSpring: 0.3,
				repulsion: 0.3,
				gravity: 0.1,
				decay: 1000,
			},
		});

		graphRef.current.setData(nodes, links);

		return (): void => {
			if (graphRef.current) {
				graphRef.current.destroy();
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="w-full h-full bg-white dark:bg-gray-900"
		/>
	);
};
