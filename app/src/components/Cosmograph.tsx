import { type FC, useMemo, useRef, useState } from "react";
import { CosmographProvider, Cosmograph } from "@cosmograph/react";
import { useQuery } from "@tanstack/react-query";

interface Node {
	ID: string;
	Value: Record<string, string>;
}

export const CosmographComponent: FC = () => {
	const { data } = useQuery({
		queryKey: ["graph", "nm1894391", 3],
		queryFn: async () => {
			const response = await fetch(
				"http://127.0.0.1:3000/node?startNode=nm0000093&depth=3"
			);
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json() as Promise<{
				vertices: Array<Node>;
				edges: Array<[string, string]>;
			}>;
		},
	});

	const links = useMemo(() => {
		return data?.edges.map(([source, target]) => ({ source, target }));
	}, [data?.edges]);

	const nodes = useMemo(() => {
		return data?.vertices.map((vertex) => {
			return {
				id: vertex.ID,
				value: vertex.Value,
			};
		});
	}, [data?.vertices]);

	// Add simulation control states
	const [linkDistance, setLinkDistance] = useState(30);
	const [repulsion, setRepulsion] = useState(0.3);
	const [gravity, setGravity] = useState(0.1);
	const simulationRef = useRef(null);

	return (
		<div className="relative w-screen h-screen">
			<CosmographProvider nodes={nodes} links={links}>
				<Cosmograph
					ref={simulationRef}
					style={{ height: "100vh", width: "100vw" }}
					linkWidth={1}
					nodeColor={(node) => (node.id.includes("nm") ? "#2563eb" : "#f25454")}
					nodeLabelAccessor={(node) => {
						if (!node?.value) return node.id;
						return (node.value.PrimaryName ||
							node.value.Title ||
							node.id) as unknown as string;
					}}
					simulationLinkDistance={linkDistance}
					simulationRepulsion={repulsion}
					simulationGravity={gravity}
					spaceSize={4096 * 2}
				/>
			</CosmographProvider>

			{/* Floating Controls */}
			<div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">
							Link Distance: {linkDistance}
						</label>
						<input
							type="range"
							min="10"
							max="100"
							value={linkDistance}
							onChange={(e) => {
								setLinkDistance(Number(e.target.value));
							}}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Repulsion: {repulsion}
						</label>
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							value={repulsion}
							onChange={(e) => setRepulsion(Number(e.target.value))}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Gravity: {gravity}
						</label>
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							value={gravity}
							onChange={(e) => setGravity(Number(e.target.value))}
							className="w-full"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
