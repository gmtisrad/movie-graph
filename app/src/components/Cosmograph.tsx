import { type FC, useMemo, useRef, useState } from "react";
import { CosmographProvider, Cosmograph } from "@cosmograph/react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { CosmosInputNode } from "@cosmograph/cosmos";

interface Node {
	ID: string;
	Value: Record<string, string>;
}

interface SearchResult {
	id: string;
	title: string;
	type: string;
	year: string;
	name?: string;
	isActor?: boolean;
}

interface CustomNode extends CosmosInputNode {
	id: string;
	value?: {
		PrimaryName?: string;
		Title?: string;
	};
}

interface OmdbSearchResponse {
	Search?: Array<{
		imdbID: string;
		Title: string;
		Type: string;
		Year: string;
	}>;
}

export const CosmographComponent: FC = () => {
	const [startNode, setStartNode] = useState("nm0042006");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState<Array<SearchResult>>([]);
	const [isSearching, setIsSearching] = useState(false);
	const debouncedSearchTerm = useDebounce(searchTerm, 300);
	const [depth, setDepth] = useState(2);

	// Add new state for colors
	const [actorColor, setActorColor] = useState("#2563eb"); // Default blue
	const [movieColor, setMovieColor] = useState("#f25454"); // Default red
	const [edgeColor, setEdgeColor] = useState("#999999"); // Default gray

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
				const movieResponse = await fetch(
					`http://www.omdbapi.com/?apikey=${import.meta.env["VITE_OMDB_API_KEY"]}&s=${debouncedSearchTerm}`
				);
				const movieData = (await movieResponse.json()) as OmdbSearchResponse;

				const movieResults =
					movieData.Search?.map((item: any) => ({
						id: item.imdbID,
						title: item.Title,
						type: item.Type,
						year: item.Year,
					})) || [];

				setSearchResults(movieResults);
			} catch (error) {
				console.error("Search error:", error);
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
			return;
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

	// Add new state for collapsed sections
	const [collapsedSections, setCollapsedSections] = useState<
		Record<string, boolean>
	>({
		search: false,
		simulation: true,
		colors: true,
	});

	const toggleSection = (section: string) => {
		setCollapsedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	// Add computed values for counts
	const nodeCount = useMemo(() => nodes?.length || 0, [nodes]);
	const edgeCount = useMemo(() => links?.length || 0, [links]);

	return (
		<div className="relative w-screen h-screen">
			<CosmographProvider nodes={nodes} links={links}>
				<Cosmograph
					ref={simulationRef}
					style={{ height: "100vh", width: "100vw" }}
					linkWidth={1}
					nodeColor={(node) =>
						node.id.includes("nm") ? actorColor : movieColor
					}
					linkColor={() => edgeColor}
					nodeLabelAccessor={(node: CustomNode) => {
						if (!node?.value) return node.id;
						return node.value["PrimaryName"] || node.value["Title"] || node.id;
					}}
					simulationLinkDistance={linkDistance}
					simulationRepulsion={repulsion}
					simulationGravity={gravity}
					spaceSize={4096 * 2}
				/>
			</CosmographProvider>

			{/* Floating Controls */}
			<div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg max-w-sm">
				<div className="space-y-4">
					{/* Add Graph Stats */}
					<div className="text-sm text-gray-600 mb-2 flex justify-between">
						<span>{nodeCount.toLocaleString()} nodes</span>
						<span>•</span>
						<span>{edgeCount.toLocaleString()} edges</span>
					</div>

					{/* Search Section */}
					<div className="border rounded-lg overflow-hidden">
						<button
							onClick={() => toggleSection("search")}
							className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
						>
							<span className="pr-8">Search & Navigation</span>
							<span
								className="transform transition-transform duration-200"
								style={{
									transform: collapsedSections["search"]
										? "rotate(180deg)"
										: "rotate(0deg)",
								}}
							>
								▼
							</span>
						</button>
						{!collapsedSections["search"] && (
							<div className="p-4 space-y-4">
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700">
										Search Movies:
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
													<div className="text-sm">
														{result.title}
														{result.isActor && " (Actor)"}
													</div>
													<div className="text-xs text-gray-500">
														{result.type}
														{result.year && ` • ${result.year}`}
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
										Start Node ID{" "}
										<span>
											<a
												href="https://developer.imdb.com/documentation/key-concepts#imdb-ids"
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs"
											>
												(?)
											</a>
											:
										</span>
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
							</div>
						)}
					</div>

					{/* Simulation Controls Section */}
					<div className="border rounded-lg overflow-hidden">
						<button
							onClick={() => toggleSection("simulation")}
							className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
						>
							<span className="pr-8">Simulation Controls</span>
							<span
								className="transform transition-transform duration-200"
								style={{
									transform: collapsedSections["simulation"]
										? "rotate(180deg)"
										: "rotate(0deg)",
								}}
							>
								▼
							</span>
						</button>
						{!collapsedSections["simulation"] && (
							<div className="p-4 space-y-4">
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
						)}
					</div>

					{/* Colors Section */}
					<div className="border rounded-lg overflow-hidden">
						<button
							onClick={() => toggleSection("colors")}
							className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
						>
							<span>Colors</span>
							<span
								className="transform transition-transform duration-200"
								style={{
									transform: collapsedSections["colors"]
										? "rotate(180deg)"
										: "rotate(0deg)",
								}}
							>
								▼
							</span>
						</button>
						{!collapsedSections["colors"] && (
							<div className="p-4">
								<div className="space-y-2">
									<label className="block text-sm font-medium text-gray-700">
										Colors:
									</label>
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="block text-xs text-gray-600">
												Actor Nodes
											</label>
											<input
												type="color"
												value={actorColor}
												onChange={(e) => setActorColor(e.target.value)}
												className="w-full h-8"
											/>
										</div>
										<div>
											<label className="block text-xs text-gray-600">
												Movie Nodes
											</label>
											<input
												type="color"
												value={movieColor}
												onChange={(e) => setMovieColor(e.target.value)}
												className="w-full h-8"
											/>
										</div>
										<div className="col-span-2">
											<label className="block text-xs text-gray-600">
												Edges
											</label>
											<input
												type="color"
												value={edgeColor}
												onChange={(e) => setEdgeColor(e.target.value)}
												className="w-full h-8"
											/>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
