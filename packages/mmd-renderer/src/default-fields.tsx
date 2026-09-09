import {
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";

import { EnumSelect } from "./enum-select";
import { FilterField } from "./filter-field";
import { ReferenceField } from "./reference-field";
import { formatDecimalValue } from "./decimal-value";
import { localDateTime, dateTimeInstant } from "./datetime-value";
import { JsonField } from "./json-field";
import { ReadonlyIdentifier } from "./readonly-identifier";
import { FieldRegistry } from "./field-registry";
import { useMmd } from "./provider";
import type { FieldRendererProps, RendererDictOption } from "./types";

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(textValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TextDisplay({ value }: FieldRendererProps) {
  return <Typography.Text>{textValue(value)}</Typography.Text>;
}

function TextEdit({ value, field, disabled, onChange }: FieldRendererProps<string>) {
  return (
    <Input
      aria-label={field.label ?? field.name}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

function TextAreaEdit({
  value,
  field,
  disabled,
  onChange,
}: FieldRendererProps<string>) {
  return (
    <Input.TextArea
      aria-label={field.label ?? field.name}
      value={value ?? ""}
      disabled={disabled}
      autoSize={{ minRows: 3, maxRows: 10 }}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

function DecimalDisplay({ value }: FieldRendererProps) {
  const { locale } = useMmd();
  return <Typography.Text>{formatDecimalValue({ value, locale })}</Typography.Text>;
}
function NumberEdit({ value, field, disabled, onChange }: FieldRendererProps<number | string | null>) {
  return (
    <InputNumber
      value={value}
      stringMode={field.decimal}
      disabled={disabled}
      style={{ width: "100%" }}
      onChange={(nextValue) => onChange?.(nextValue)}
    />
  );
}

function MoneyDisplay({ value, field }: FieldRendererProps<number>) {
  const { locale } = useMmd();
  const currency = typeof field.currency === "string" ? field.currency : "USD";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? (
    <Typography.Text>
      {new Intl.NumberFormat(locale, { style: "currency", currency }).format(
        amount,
      )}
    </Typography.Text>
  ) : (
    <Typography.Text>—</Typography.Text>
  );
}

function BooleanDisplay({ value }: FieldRendererProps<boolean>) {
  const { t } = useMmd();
  return (
    <Tag color={value ? "green" : "default"}>
      {t(value ? "common.yes" : "common.no")}
    </Tag>
  );
}

function BooleanEdit({
  value,
  disabled,
  onChange,
}: FieldRendererProps<boolean>) {
  return (
    <Switch
      checked={Boolean(value)}
      disabled={disabled}
      onChange={(checked) => onChange?.(checked)}
    />
  );
}

function optionForValue(
  options: RendererDictOption[],
  value: unknown,
): RendererDictOption | undefined {
  return options.find((option) => option.value === value);
}

function SingleDisplay({ field, value }: FieldRendererProps) {
  const { t } = useMmd();
  const option = optionForValue(field.options ?? [], value);
  const key = `options.${field.name}.${String(value)}`;
  const translated = t(key);
  return (
    <Tag color={option?.color}>
      {translated === key ? (option?.label ?? textValue(value)) : translated}
    </Tag>
  );
}

function SingleEdit(props: FieldRendererProps) { return <EnumSelect {...props} />; }

function MultiDisplay({ field, value }: FieldRendererProps<unknown[]>) {
  const { t } = useMmd();
  const values = Array.isArray(value) ? value : [];
  return (
    <Space size={[4, 4]} wrap>
      {values.map((item) => {
        const option = optionForValue(field.options ?? [], item);
        const key = `options.${field.name}.${String(item)}`;
        const translated = t(key);
        return (
          <Tag color={option?.color} key={String(item)}>
            {translated === key
              ? (option?.label ?? textValue(item))
              : translated}
          </Tag>
        );
      })}
    </Space>
  );
}

function MultiEdit(props: FieldRendererProps) { return <EnumSelect {...props} multiple />; }

function DateTimeDisplay({ value }: FieldRendererProps) {
  const { locale } = useMmd();
  const date = new Date(String(value ?? ""));
  return (
    <Typography.Text>
      {Number.isNaN(date.getTime())
        ? textValue(value)
        : date.toLocaleString(locale)}
    </Typography.Text>
  );
}

function DateTimeEdit({
  value,
  disabled,
  onChange,
}: FieldRendererProps<string | null>) {
  const normalized = localDateTime(value);
  return (
    <Input
      type="datetime-local"
      step="0.001"
      value={normalized}
      disabled={disabled}
      onChange={(event) => onChange?.(dateTimeInstant(event.target.value))}
    />
  );
}

function ImageDisplay({ value, field }: FieldRendererProps<string>) {
  return value ? (
    <Image
      src={value}
      alt={field.label ?? field.name}
      width={48}
      height={48}
      style={{ objectFit: "cover" }}
    />
  ) : (
    <Typography.Text>—</Typography.Text>
  );
}

const text = { default: TextDisplay, form: TextEdit, search: TextEdit };
const textarea = {
  default: TextDisplay,
  form: TextAreaEdit,
  search: TextEdit,
};
const number = { default: DecimalDisplay, form: NumberEdit, search: FilterField };
const money = { default: MoneyDisplay, form: NumberEdit, search: NumberEdit };
const boolean = {
  default: BooleanDisplay,
  form: BooleanEdit,
  search: FilterField,
};
const single = {
  default: SingleDisplay,
  form: SingleEdit,
  search: SingleEdit,
};
const multi = {
  default: MultiDisplay,
  form: MultiEdit,
  search: MultiEdit,
};
const datetime = {
  default: DateTimeDisplay,
  form: DateTimeEdit,
  search: FilterField,
};

export function createDefaultFieldRegistry(): FieldRegistry {
  const registry = new FieldRegistry();
  registry.register("json", { default: JsonField });
  for (const type of ["text", "detail"]) registry.register(type, text);
  registry.register("key", { default: ReadonlyIdentifier, search: TextEdit });
  for (const type of ["textarea", "html", "htmldetail"]) {
    registry.register(type, textarea);
  }
  for (const type of ["number", "numberrange", "duration", "durationdetail"]) {
    registry.register(type, number);
  }
  registry.register("money", money);
  for (const type of ["boolean", "switch", "booleandetail", "booleanselect"]) {
    registry.register(type, boolean);
  }
  for (const type of ["single", "status", "singledetail"]) {
    registry.register(type, single);
  }
  for (const type of ["multi", "tags", "multidetail", "multiselect"]) {
    registry.register(type, multi);
  }
  for (const type of [
    "datetime",
    "datatime",
    "datetimedetail",
    "datatimerange",
    "datetimerange",
  ]) {
    registry.register(type, datetime);
  }
  registry.register("decimal", number);
  for (const type of ["reference", "toone", "tooneedit", "toonedetail", "linkone", "linkonedetail"]) {
    registry.register(type, { default: ReferenceField });
  }
  registry.register("image", { default: ImageDisplay, form: TextEdit });
  for (const type of [
    "tomany",
    "tomanydetail",
    "tomanay",
    "linkmany",
    "linkmanay",
  ]) {
    registry.register(type, text);
  }
  return registry;
}
