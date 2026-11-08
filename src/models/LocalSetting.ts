export interface LocalSetting {
    key: string; // Unique key identifier for the setting
    keyName: string; // Display name for the table
    value: string | number | boolean; // Setting value
    valueType: "string" | "number" | "boolean"; // Data type of the setting value
}
