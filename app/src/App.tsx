import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type createRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { FunctionComponent } from "./common/types";

const queryClient = new QueryClient();

type AppProps = { router: ReturnType<typeof createRouter> };

const App = ({ router }: AppProps): FunctionComponent => {
	useEffect(() => {
		// Check system preference and set initial theme
		if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			document.documentElement.classList.add("dark");
		}
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
};

export default App;
