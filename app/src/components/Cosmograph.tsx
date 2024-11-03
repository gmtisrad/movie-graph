import { type FC, useEffect, useMemo, useRef } from "react";
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
				"http://127.0.0.1:3000/node?startNode=nm1894391&depth=3"
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

	return (
		<CosmographProvider nodes={nodes} links={links}>
			<Cosmograph
				style={{ height: "100vh", width: "100vw" }}
				linkWidth={1}
				nodeColor={(node) => (node.id.includes("nm") ? "#2563eb" : "#f25454")}
				nodeLabelAccessor={(node) => {
					if (!node?.value) return node.id;
					return (node.value.PrimaryName ||
						node.value.Title ||
						node.id) as unknown as string;
				}}
			/>
		</CosmographProvider>
	);
};
