export type PostcardTemplateId = "template-1" | "template-2" | "template-3" | "template-4"

export type PostcardTextAlign = "left" | "center" | "right"

export type PostcardTemplateConfig = {
  photoArea?: {
    top: string
    left: string
    width: string
    height: string
    borderRadius?: string
  }
  textStyle?: {
    fontSize?: string
    lineHeight?: number
  }
  textArea: {
    top: string
    left: string
    width: string
    height?: string
    align?: PostcardTextAlign
  }
}

export const TEMPLATE_CONFIG: Record<PostcardTemplateId, PostcardTemplateConfig> = {
  "template-1": {
    textStyle: {
      lineHeight: 1.48,
    },
    textArea: {
      top: "calc(44% - 24px)",
      left: "calc(52% + 15px)",
      width: "37%",
      height: "44%",
      align: "left",
    },
  },
  "template-2": {
    textStyle: {
      lineHeight: 1.48,
    },
    textArea: {
      top: "calc(44% - 12px)",
      left: "calc(52% + 10px)",
      width: "37%",
      height: "44%",
      align: "left",
    },
  },
  "template-3": {
    // Template-3 has the photo frame on the RIGHT and writing area on the LEFT.
    photoArea: {
      top: "22%",
      left: "51%",
      width: "42%",
      height: "56%",
      borderRadius: "10px",
    },
    textStyle: {
      fontSize: "clamp(16px, 2.2vw, 20px)",
      lineHeight: 1.56,
    },
    textArea: {
      top: "calc(44% - 4px)",
      left: "calc(7% + 27px)",
      width: "37%",
      height: "44%",
      align: "left",
    },
  },
  "template-4": {
    textStyle: {
      lineHeight: 1.48,
    },
    textArea: {
      top: "calc(44% - 30px)",
      left: "calc(52% + 8px)",
      width: "37%",
      height: "44%",
      align: "left",
    },
  },
}

export function getTemplateConfig(template: string | undefined | null): PostcardTemplateConfig {
  const key = (template || "") as PostcardTemplateId
  return TEMPLATE_CONFIG[key] || TEMPLATE_CONFIG["template-1"]
}
