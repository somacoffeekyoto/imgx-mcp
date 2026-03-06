// === Capability: プロバイダが対応する機能 ===

export enum Capability {
  TEXT_TO_IMAGE = "TEXT_TO_IMAGE",
  ASPECT_RATIO = "ASPECT_RATIO",
  IMAGE_EDITING = "IMAGE_EDITING",
  RESOLUTION_CONTROL = "RESOLUTION_CONTROL",
  MULTIPLE_OUTPUTS = "MULTIPLE_OUTPUTS",
  REFERENCE_IMAGES = "REFERENCE_IMAGES",
  PERSON_CONTROL = "PERSON_CONTROL",
  STYLE_CONTROL = "STYLE_CONTROL",
  OUTPUT_FORMAT = "OUTPUT_FORMAT",
}

// === 共通入出力型 ===

export interface GenerateInput {
  prompt: string;
  outputPath?: string;
  aspectRatio?: string;
  count?: number;
  resolution?: string;
  outputFormat?: "png" | "jpeg" | "webp";
  background?: "transparent" | "opaque" | "auto";
}

export interface EditInput extends GenerateInput {
  inputImage: string; // ファイルパス
}

export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
}

export interface ImageResult {
  success: boolean;
  images: GeneratedImage[];
  error?: string;
}

// === プロバイダ情報 ===

export interface ProviderInfo {
  name: string;
  models: string[];
  defaultModel: string;
  capabilities: Set<Capability>;
  aspectRatios: string[];
  resolutions?: string[];
}
