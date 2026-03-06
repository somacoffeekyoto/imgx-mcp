import { Capability, type ProviderInfo } from "../../core/types.js";

export const GEMINI_PROVIDER_INFO: ProviderInfo = {
  name: "gemini",
  models: ["gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"],
  defaultModel: "gemini-3-pro-image-preview",
  capabilities: new Set([
    Capability.TEXT_TO_IMAGE,
    Capability.ASPECT_RATIO,
    Capability.IMAGE_EDITING,
    Capability.RESOLUTION_CONTROL,
    Capability.REFERENCE_IMAGES,
    Capability.PERSON_CONTROL,
  ]),
  aspectRatios: [
    "1:1",
    "1:4",
    "1:8",
    "2:3",
    "3:2",
    "3:4",
    "4:1",
    "4:3",
    "4:5",
    "5:4",
    "8:1",
    "9:16",
    "16:9",
    "21:9",
  ],
  resolutions: ["1K", "2K", "4K"],
};
