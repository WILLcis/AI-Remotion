import sampleRenderPlanJson from "../../../episodes/sample/render-plan.json";
import { renderPlanSchema } from "../../schemas/artifacts";
import type { RenderPlan } from "../types";

export const sampleRenderPlan: RenderPlan =
  renderPlanSchema.parse(sampleRenderPlanJson);
