import OpenAI from "openai"

class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIError";
  }
}

export async function generateFlashcards(text: string, apiKey: string, model: string, sep: string = "::"): Promise<string> {

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const cleanedText = text.replace(/<!--.*-->[\n]?/g, "");

  const basePrompt = `I'll provide you with a note. At the end of the note are some flashcards. Identify which are the most important concepts within the note and generate new original flashcard in the format \"question ${sep} answer\". Strictly use ${sep} to separate a question from its answer. Separate flashcards with a single newline. An example is \"What is chemical formula of water ${sep} H2O\". Do not use any prefix text, start generating right away. Try to make them as atomic as possible, but still challenging and rich of information. DO NOT REPEAT OR REPHRASE FLASHCARDS.`;
  const additionalPrompt = "Additional information on the task: Use the same language as used in the note. Do NOT always start the questions with What. Do not repeat questions. Do not rephrase questions already generated. You can also ask the user to describe something or detail a given concept. You can even write flashcards asking to fill a missing word or phrase.";

  let response = await openai.chat.completions.create({
    messages: [
      {"role": "system", "content": basePrompt},
      {"role": "system", "content": additionalPrompt},
      {"role": "user", "content": cleanedText}
    ],
    model: model
  })

  if (response.choices[0].message.content) {
    return response.choices[0].message.content
  }

  throw new OpenAIError("No response received from OpenAI API");
}
