export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function humanLikeDelay(): Promise<void> {
  return randomDelay(1500, 4000);
}

export function shortDelay(): Promise<void> {
  return randomDelay(300, 800);
}

export function typingDelay(): Promise<void> {
  return randomDelay(50, 150);
}
