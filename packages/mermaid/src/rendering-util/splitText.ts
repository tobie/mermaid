export type CheckFitFunction = (text: string) => boolean;

/**
 * Splits a string into graphemes if available, otherwise characters.
 */
export function splitTextToChars(text: string): string[] {
  if (Intl.Segmenter) {
    return [...new Intl.Segmenter().segment(text)].map((s) => s.segment);
  }
  return [...text];
}

/**
 * Splits a string into words.
 */
function splitLineToWords(text: string): string[] {
  if (Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].map(
      (s) => s.segment
    );
  }
  // Split by ' ' removes the ' 's from the result.
  const words = text.split(' ');
  // Add the ' 's back to the result.
  const wordsWithSpaces = words.flatMap((s) => [s, ' ']);
  // Remove last space.
  wordsWithSpaces.pop();
  return wordsWithSpaces;
}

/**
 * Splits a word into two parts, the first part fits the width and the remaining part.
 * @param checkFit - Function to check if word fits
 * @param word - Word to split
 * @returns [first part of word that fits, rest of word]
 */
export function splitWordToFitWidth(checkFit: CheckFitFunction, word: string): [string, string] {
  const characters = splitTextToChars(word);
  if (characters.length === 0) {
    return ['', ''];
  }
  return splitWordToFitWidthRecursion(checkFit, [], characters);
}

function splitWordToFitWidthRecursion(
  checkFit: CheckFitFunction,
  usedChars: string[],
  remainingChars: string[]
): [string, string] {
  // eslint-disable-next-line no-console
  console.error({ usedChars, remainingChars });
  if (remainingChars.length === 0) {
    return [usedChars.join(''), ''];
  }
  const [nextChar, ...rest] = remainingChars;
  const newWord = [...usedChars, nextChar];
  if (checkFit(newWord.join(''))) {
    return splitWordToFitWidthRecursion(checkFit, newWord, rest);
  }
  return [usedChars.join(''), remainingChars.join('')];
}

export function splitLineToFitWidth(line: string, checkFit: CheckFitFunction): string[] {
  if (line.includes('\n')) {
    throw new Error('splitLineToFitWidth does not support newlines in the line');
  }
  const words = splitLineToWords(line);
  return splitLineToFitWidthRecursion(words, checkFit);
}

function splitLineToFitWidthRecursion(
  words: string[],
  checkFit: CheckFitFunction,
  lines: string[] = [],
  newLine = ''
): string[] {
  // eslint-disable-next-line no-console
  console.error({ words, lines, newLine });
  // Return if there is nothing left to split
  if (words.length === 0) {
    // If there is a new line, add it to the lines
    if (newLine.length > 0) {
      lines.push(newLine);
    }
    return lines.length > 0 ? lines : [''];
  }
  let joiner = '';
  if (words[0] === ' ') {
    joiner = ' ';
    words.shift();
  }
  const nextWord = words.shift() ?? ' ';

  const nextWordWithJoiner = joiner + nextWord;
  const lineWithNextWord = newLine ? `${newLine}${nextWordWithJoiner}` : nextWordWithJoiner;
  if (checkFit(lineWithNextWord)) {
    // nextWord fits, so we can add it to the new line and continue
    return splitLineToFitWidthRecursion(words, checkFit, lines, lineWithNextWord);
  }

  // nextWord doesn't fit, so we need to split it
  if (newLine.length > 0) {
    // There was text in newLine, so add it to lines and push nextWord back into words.
    lines.push(newLine);
    words.unshift(nextWord);
  } else {
    // There was no text in newLine, so we need to split nextWord
    const [line, rest] = splitWordToFitWidth(checkFit, nextWord);
    lines.push(line);
    words.unshift(rest);
  }
  return splitLineToFitWidthRecursion(words, checkFit, lines);
}