import { Capability, type ProviderInfo } from "../../core/types.js";

export const OPENAI_PROVIDER_INFO: ProviderInfo = {
  name: "openai",
  models: ["gpt-image-1", "gpt-image-1.5", "gpt-image-1-mini"],
  defaultModel: "gpt-image-1",
  capabilities: new Set([
    Capability.TEXT_TO_IMAGE,
    Capability.ASPECT_RATIO,
    Capability.IMAGE_EDITING,
    Capability.MULTIPLE_OUTPUTS,
    Capability.OUTPUT_FORMAT,
  ]),
  aspectRatios: ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4"],
  resolutions: ["1K", "2K", "4K"],
};
