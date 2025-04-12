import { uniqueNamesGenerator, colors, animals } from "unique-names-generator";

export function randomId() {
  return Math.random().toString(36).substring(2, 9);
}

export function randomName() {
  return uniqueNamesGenerator({
    dictionaries: [animals, colors],
    length: 2,
    separator: "",
    style: "capital",
  });
}
