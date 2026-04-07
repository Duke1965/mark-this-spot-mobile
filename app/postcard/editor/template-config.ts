export type PostcardTemplateId = "template-1" | "template-2" | "template-3" | "template-4"

export type PostcardTextAlign = "left" | "center" | "right"

export type PostcardTemplateConfig = {
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
    textArea: {
      top: "40%",
      left: "51.5%",
      width: "41%",
      height: "46%",
      align: "left",
    },
  },
  "template-2": {
    textArea: {
      top: "40%",
      left: "51.5%",
      width: "41%",
      height: "46%",
      align: "left",
    },
  },
  "template-3": {
    textArea: {
      top: "40%",
      left: "51.5%",
      width: "41%",
      height: "46%",
      align: "left",
    },
  },
  "template-4": {
    textArea: {
      top: "40%",
      left: "51.5%",
      width: "41%",
      height: "46%",
      align: "left",
    },
  },
}

export function getTemplateConfig(template: string | undefined | null): PostcardTemplateConfig {
  const key = (template || "") as PostcardTemplateId
  return TEMPLATE_CONFIG[key] || TEMPLATE_CONFIG["template-1"]
}

