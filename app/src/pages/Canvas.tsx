import * as THREE from "three";
import { useEffect, useRef } from "react";

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

		// Add animation loop
		const animate = (): void => {
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
		};
		animate();

		// Cleanup function
		return (): void => {
			if (refContainer.current) {
				refContainer.current.removeChild(renderer.domElement);
			}
		};
	}, []);

	return <div ref={refContainer}></div>;
};
