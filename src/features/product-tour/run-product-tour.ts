import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Role } from "@/entities/profile/model";
import { stepsForRole } from "./steps";

export interface RunProductTourOptions {
  role: Role;
  onDone: () => void;
}

export const runProductTour = ({ role, onDone }: RunProductTourOptions): void => {
  driver({
    steps: stepsForRole(role),
    popoverClass: "radarge-tour",
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Concluir",
    onDestroyed: onDone,
  }).drive();
};
