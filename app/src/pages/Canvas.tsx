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

const BACKGROUND_COLOR = new THREE.Color(0x00ff00);

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

		VERTICES.forEach((node: string) => {
			console.log({ node });
			const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
			sphere.position.x = Math.random() * NODE_SPACING * NODE_RADIUS;
			sphere.position.y = Math.random() * NODE_SPACING * NODE_RADIUS;
			sphere.position.z = Math.random() * NODE_SPACING * NODE_RADIUS;
			scene.add(sphere);
		});

		camera.position.z = 10;

		// Add OrbitControls
		const controls = new OrbitControls(camera, renderer.domElement);

		// Keyboard controls setup
		const keyState: { [key: string]: boolean } = {};
		const moveSpeed = 0.1;

		window.addEventListener("keydown", (e) => {
			keyState[e.key.toLowerCase()] = true;
		});

		window.addEventListener("keyup", (e) => {
			keyState[e.key.toLowerCase()] = false;
		});

		// Update animate function to include controls
		const animate = (): void => {
			requestAnimationFrame(animate);

			// Handle keyboard movement
			if (keyState["w"] || keyState["arrowup"]) camera.position.y += moveSpeed;
			if (keyState["s"] || keyState["arrowdown"])
				camera.position.y -= moveSpeed;
			if (keyState["a"] || keyState["arrowleft"])
				camera.position.x -= moveSpeed;
			if (keyState["d"] || keyState["arrowright"])
				camera.position.x += moveSpeed;

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
