import * as THREE from "three";
import { useEffect, useRef } from "react";

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

const VERTICES = [
	"nm0001412",
	"tt0077089",
	"nm0001063",
	"tt1141783",
	"nm2811587",
	"tt1142453",
	"nm0129287",
	"tt2382807",
	"nm0000120",
];

const EDGES = [
	["nm0001412", "tt0077089"],
	["tt0077089", "nm0001063"],
	["nm0001063", "tt1141783"],
	["tt1141783", "nm2811587"],
	["nm2811587", "tt1142453"],
	["tt1142453", "nm0129287"],
	["nm0129287", "tt2382807"],
	["tt2382807", "nm0000120"],
];

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

		VERTICES.forEach((node: string) => {
			console.log({ node });
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
			nodePositions.set(node, sphere.position.clone());
			nodeMeshes.set(node, sphere);

			scene.add(sphere);
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
