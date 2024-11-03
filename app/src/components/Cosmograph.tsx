import { type FC, useMemo, useRef, useState } from "react";
import { CosmographProvider, Cosmograph } from "@cosmograph/react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";

interface Node {
	ID: string;
	Value: Record<string, string>;
}

interface SearchResult {
	id: string;
	title: string;
	type: string;
	year: string;
}

export const CosmographComponent: FC = () => {
	const [startNode, setStartNode] = useState("nm0000093");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState<Array<SearchResult>>([]);
	const [isSearching, setIsSearching] = useState(false);
	const debouncedSearchTerm = useDebounce(searchTerm, 300);
	const [depth, setDepth] = useState(3);

	const { data, refetch } = useQuery({
		queryKey: ["graph", startNode, depth],
		queryFn: async () => {
			const response = await fetch(
				`http://127.0.0.1:3000/node?startNode=${startNode}&depth=${depth}`
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

	useQuery({
		queryKey: ["search", debouncedSearchTerm],
		queryFn: async () => {
			if (!debouncedSearchTerm) {
				setSearchResults([]);
				return null;
			}
			setIsSearching(true);
			try {
				const response = await fetch(
					`http://www.omdbapi.com/?apikey=${import.meta.env["VITE_OMDB_API_KEY"]}&s=${debouncedSearchTerm}`
				);
				const data = await response.json();
				if ((data as unknown as { Search: Array<any> })?.Search) {
					setSearchResults(
						data.Search.map((item: any) => ({
							id: item.imdbID,
							title: item.Title,
							type: item.Type,
							year: item.Year,
						}))
					);
				} else {
					setSearchResults([]);
				}
			} catch (error) {
				console.error("Search error:", error);
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
		},
		enabled: Boolean(debouncedSearchTerm),
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
					<div className="relative">
						<label className="block text-sm font-medium text-gray-700">
							Search Movies/People:
						</label>
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-2 py-1 border rounded"
							placeholder="Search..."
						/>
						{/* Autocomplete dropdown */}
						{searchResults.length > 0 && (
							<div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
								{searchResults.map((result) => (
									<button
										key={result.id}
										onClick={() => {
											setStartNode(result.id);
											setSearchTerm("");
											setSearchResults([]);
											refetch();
										}}
										className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none"
									>
										<div className="text-sm">{result.title}</div>
										<div className="text-xs text-gray-500">
											{result.type} • {result.year}
										</div>
									</button>
								))}
							</div>
						)}
						{isSearching && (
							<div className="absolute right-2 top-8">
								<div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
							</div>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Start Node ID:
						</label>
						<input
							type="text"
							value={startNode}
							onChange={(event) => setStartNode(event.target.value)}
							className="w-full px-2 py-1 border rounded"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Depth: {depth}
						</label>
						<input
							type="range"
							min="1"
							max="5"
							value={depth}
							onChange={(event) => setDepth(Number(event.target.value))}
							className="w-full"
						/>
					</div>

					<button
						onClick={() => refetch()}
						className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
					>
						Regenerate Graph
					</button>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Link Distance: {linkDistance}
						</label>
						<input
							type="range"
							min="10"
							max="100"
							value={linkDistance}
							onChange={(event) => {
								setLinkDistance(Number(event.target.value));
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
							onChange={(event) => {
								setRepulsion(Number(event.target.value));
							}}
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
							onChange={(event) => {
								setGravity(Number(event.target.value));
							}}
							className="w-full"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
