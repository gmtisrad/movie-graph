import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "../common/types";

export const Home = (): FunctionComponent => {
	const { t, i18n } = useTranslation();

	const onTranslateButtonClick = async (): Promise<void> => {
		if (i18n.resolvedLanguage === "en") {
			await i18n.changeLanguage("es");
		} else {
			await i18n.changeLanguage("en");
		}
	};

	return (
		<div className="bg-gray-100 dark:bg-gray-900 font-bold w-screen h-screen flex flex-col justify-center items-center">
			<p className="text-gray-900 dark:text-white text-6xl">
				{t("home.greeting")}
			</p>
			<button
				type="submit"
				onClick={onTranslateButtonClick}
				className="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
			>
				translate
			</button>
		</div>
	);
};
