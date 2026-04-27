type Compare<T> = (a: T, b: T) => number;

export class MinHeap<T> {
  private heap: T[] = [];
  constructor(private readonly cmp: Compare<T>) {}

  size(): number {
    return this.heap.length;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  push(item: T): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  clear(): void {
    this.heap.length = 0;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.heap[i], this.heap[parent]) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.cmp(this.heap[l], this.heap[smallest]) < 0) smallest = l;
      if (r < n && this.cmp(this.heap[r], this.heap[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

export interface InternalEvent {
  t: number;
  seq: number;
  kind:
    | "SETUP_FINISHED"
    | "JOB_FINISHED"
    | "ORDER_ARRIVED"
    | "DISPATCH";
  machineId?: string;
  jobId?: string;
  orderId?: string;
}

export const eventCompare: Compare<InternalEvent> = (a, b) => {
  if (a.t !== b.t) return a.t - b.t;
  return a.seq - b.seq;
};
