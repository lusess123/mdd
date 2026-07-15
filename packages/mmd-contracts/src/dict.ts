export interface DictOption<T = unknown> {
  value: T;
  label: string;
  index?: number;
}

export type Dict<T = unknown> = Record<string, DictOption<T>>;

export type IDictOption<T = unknown> = DictOption<T>;
export type IDict<T = unknown> = Dict<T>;
