import * as THREE from "three";
import { useEffect, useRef } from "react";

const EDGES = [
	["nm1894391", "tt0386757"],
	["nm1894391", "tt0626104"],
	["nm1894391", "tt0626121"],
	["nm1894391", "tt0626124"],
	["tt0386757", "nm0124132"],
	["tt0386757", "nm0124133"],
	["tt0386757", "nm0000285"],
	["tt0386757", "nm0001051"],
	["tt0626104", "nm0272401"],
	["tt0626104", "nm1961678"],
	["tt0626104", "nm1323599"],
	["tt0626104", "nm1039205"],
	["tt0626121", "nm0036250"],
	["tt0626124", "nm1802686"],
	["tt0626124", "nm1855023"],
	["tt0626124", "nm0001458"],
];

const VERTICES = {
	tt0626104: {
		EndYear: -1,
		ID: "tt0626104",
		StartYear: 2005,
		Title: "Episode #1.105",
		Type: "tvEpisode",
	},
	tt0626121: {
		EndYear: -1,
		ID: "tt0626121",
		StartYear: 2005,
		Title: "Episode #1.121",
		Type: "tvEpisode",
	},
	tt0626124: {
		EndYear: -1,
		ID: "tt0626124",
		StartYear: 2005,
		Title: "Episode #1.124",
		Type: "tvEpisode",
	},
	nm0124132: {
		BirthYear: 1924,
		DeathYear: 2018,
		ID: "nm0124132",
		PrimaryName: "George Bush",
	},
	nm0124133: {
		BirthYear: 1946,
		DeathYear: 0,
		ID: "nm0124133",
		PrimaryName: "George W. Bush",
	},
	nm0000285: {
		BirthYear: 1958,
		DeathYear: 0,
		ID: "nm0000285",
		PrimaryName: "Alec Baldwin",
	},
	nm0001051: {
		BirthYear: 1946,
		DeathYear: 0,
		ID: "nm0001051",
		PrimaryName: "Bill Clinton",
	},
	nm0272401: {
		BirthYear: 1962,
		DeathYear: 0,
		ID: "nm0272401",
		PrimaryName: "Craig Ferguson",
	},
	nm1961678: {
		BirthYear: 0,
		DeathYear: 0,
		ID: "nm1961678",
		PrimaryName: "The Krumpers \u0026 Clowns",
	},
	nm1323599: {
		BirthYear: 0,
		DeathYear: 0,
		ID: "nm1323599",
		PrimaryName: "Brian McAloon",
	},
	nm1039205: {
		BirthYear: 0,
		DeathYear: 0,
		ID: "nm1039205",
		PrimaryName: "Ross Abrash",
	},
	nm0036250: {
		BirthYear: 1934,
		DeathYear: 0,
		ID: "nm0036250",
		PrimaryName: "Peter Arnett",
	},
	nm1802686: {
		BirthYear: 0,
		DeathYear: 0,
		ID: "nm1802686",
		PrimaryName: "Kip Madsen",
	},
	nm1855023: {
		BirthYear: 0,
		DeathYear: 0,
		ID: "nm1855023",
		PrimaryName: "Richard Malmos",
	},
	nm0001458: {
		BirthYear: 1926,
		DeathYear: 2021,
		ID: "nm0001458",
		PrimaryName: "Cloris Leachman",
	},
};

// Custom orbit controls implementation

class OrbitControls {
	private readonly camera: THREE.Camera;
	private readonly domElement: HTMLElement;
	private isDragging = false;
	private previousMousePosition = { x: 0, y: 0 };
	private readonly spherical = new THREE.Spherical();
	private readonly target = new THREE.Vector3();

	public constructor(camera: THREE.Camera, domElement: HTMLElement) {
		this.camera = camera;
		this.domElement = domElement;

		this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this));
		this.domElement.addEventListener("mouseup", this.onMouseUp.bind(this));
		this.domElement.addEventListener("wheel", this.onMouseWheel.bind(this));

		// Set initial position
		this.camera.position.set(0, 0, 10);
		this.update();
	}

	public setTarget(target: THREE.Vector3): void {
		this.target.copy(target);
		this.update();
	}

	private onMouseDown(event: MouseEvent): void {
		this.isDragging = true;
		this.previousMousePosition = {
			x: event.clientX,
			y: event.clientY,
		};
	}

	private onMouseMove(event: MouseEvent): void {
		if (!this.isDragging) return;

		const deltaMove = {
			x: event.clientX - this.previousMousePosition.x,
			y: event.clientY - this.previousMousePosition.y,
		};

		// Convert to spherical coordinates
		this.spherical.setFromVector3(this.camera.position.sub(this.target));

		// Update angles
		this.spherical.phi = Math.max(
			0.1,
			Math.min(Math.PI - 0.1, this.spherical.phi + deltaMove.y * 0.01)
		);
		this.spherical.theta += deltaMove.x * 0.01;

		// Convert back to Cartesian coordinates
		this.camera.position.setFromSpherical(this.spherical).add(this.target);
		this.camera.lookAt(this.target);

		this.previousMousePosition = {
			x: event.clientX,
			y: event.clientY,
		};
	}

	private onMouseUp(): void {
		this.isDragging = false;
	}

	private onMouseWheel(event: WheelEvent): void {
		const zoomSpeed = 0.1;
		const direction = event.deltaY > 0 ? 1 : -1;
		const distance = this.camera.position.distanceTo(this.target);
		const newDistance = distance * (1 + direction * zoomSpeed);

		this.camera.position
			.sub(this.target)
			.normalize()
			.multiplyScalar(newDistance)
			.add(this.target);
	}

	public update(): void {
		this.camera.lookAt(this.target);
	}

	public rotateAroundTarget(deltaTheta: number, deltaPhi: number): void {
		// Convert current camera position to spherical coordinates relative to target
		const offset = this.camera.position.clone().sub(this.target);
		this.spherical.setFromVector3(offset);

		// Update angles
		this.spherical.theta += deltaTheta;
		this.spherical.phi = Math.max(
			0.1,
			Math.min(Math.PI - 0.1, this.spherical.phi + deltaPhi)
		);

		// Convert back to Cartesian coordinates
		offset.setFromSpherical(this.spherical);
		this.camera.position.copy(this.target).add(offset);
		this.camera.lookAt(this.target);
	}
}

const NODE_RADIUS = 0.5;
const NODE_SPACING = 6;

const BACKGROUND_COLOR = new THREE.Color(0x000000);

export const GraphCanvas = (): JSX.Element => {
	const refContainer = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const scene = new THREE.Scene();

		console.log({ BACKGROUND_COLOR });
		scene.background = BACKGROUND_COLOR;
		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(window.innerWidth, window.innerHeight);

		// Mount Three.js scene to the ref container
		if (refContainer.current) {
			refContainer.current.appendChild(renderer.domElement);
		}

		const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS, 10, 10);
		const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

		const nodePositions = new Map<string, THREE.Vector3>();
		const nodeMeshes = new Map<string, THREE.Mesh>();

		const minDistance = NODE_SPACING * NODE_RADIUS;

		// Helper function to check if a position is valid
		const isValidPosition = (position: THREE.Vector3): boolean => {
			for (const existingPosition of nodePositions.values()) {
				if (position.distanceTo(existingPosition) < minDistance) {
					return false;
				}
			}
			return true;
		};

		// Helper function to get a random position
		const getRandomPosition = (): THREE.Vector3 => {
			return new THREE.Vector3(
				Math.random() * NODE_SPACING * NODE_RADIUS * 2 -
					NODE_SPACING * NODE_RADIUS,
				Math.random() * NODE_SPACING * NODE_RADIUS * 2 -
					NODE_SPACING * NODE_RADIUS,
				Math.random() * NODE_SPACING * NODE_RADIUS * 2 -
					NODE_SPACING * NODE_RADIUS
			);
		};

		Object.entries(VERTICES).forEach(([nodeId, _]) => {
			console.log({ nodeId });
			const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);

			// Try to find a valid position
			let position: THREE.Vector3;
			let attempts = 0;
			const maxAttempts = 100;

			do {
				position = getRandomPosition();
				attempts++;
			} while (!isValidPosition(position) && attempts < maxAttempts);

			sphere.position.copy(position);

			// Store node position and mesh
			nodePositions.set(nodeId, sphere.position.clone());
			nodeMeshes.set(nodeId, sphere);

			scene.add(sphere);
		});

		// Draw edges between nodes
		const edgeGeometry = new THREE.BufferGeometry();
		const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

		EDGES.forEach(([fromNode, toNode]) => {
			const fromPosition = nodePositions.get(fromNode);
			const toPosition = nodePositions.get(toNode);

			if (fromPosition && toPosition) {
				const points = [fromPosition, toPosition];
				edgeGeometry.setFromPoints(points);
				const line = new THREE.Line(edgeGeometry.clone(), edgeMaterial);
				scene.add(line);
			}
		});

		camera.position.z = 10;

		// Add OrbitControls
		const controls = new OrbitControls(camera, renderer.domElement);

		// Set initial focus to first node
		const firstNodePosition = nodePositions.get(VERTICES[0]!);
		if (firstNodePosition) {
			controls.setTarget(firstNodePosition);
		}

		// Add click event listener for node selection
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		renderer.domElement.addEventListener("click", (event) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(
				Array.from(nodeMeshes.values())
			);

			if (intersects.length > 0) {
				const clickedMesh = intersects[0]?.object;
				const clickedNode = Array.from(nodeMeshes.entries()).find(
					([_, mesh]) => mesh === clickedMesh
				);
				if (clickedNode) {
					const position = nodePositions.get(clickedNode[0]);
					if (position) {
						controls.setTarget(position);
					}
				}
			}
		});

		// Keyboard controls setup
		const keyState: { [key: string]: boolean } = {};
		const rotateSpeed = 0.05;

		window.addEventListener("keydown", (keydownEvent) => {
			keyState[keydownEvent.key.toLowerCase()] = true;
		});

		window.addEventListener("keyup", (keyupEvent) => {
			keyState[keyupEvent.key.toLowerCase()] = false;
		});

		// Update animate function to include controls
		const animate = (): void => {
			requestAnimationFrame(animate);

			// Handle keyboard rotation
			if (keyState["w"]) controls.rotateAroundTarget(0, -rotateSpeed);
			if (keyState["s"]) controls.rotateAroundTarget(0, rotateSpeed);
			if (keyState["a"]) controls.rotateAroundTarget(-rotateSpeed, 0);
			if (keyState["d"]) controls.rotateAroundTarget(rotateSpeed, 0);

			controls.update();
			renderer.render(scene, camera);
		};
		animate();

		// Update cleanup function
		return (): void => {
			if (refContainer.current) {
				refContainer.current.removeChild(renderer.domElement);
			}
			window.removeEventListener("keydown", (keydownEvent) => {
				keyState[keydownEvent.key.toLowerCase()] = true;
			});
			window.removeEventListener("keyup", (keyupEvent) => {
				keyState[keyupEvent.key.toLowerCase()] = false;
			});
		};
	}, []);

	return <div ref={refContainer}></div>;
};
