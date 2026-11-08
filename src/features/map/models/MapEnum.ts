export enum MapType {
    Default = "Default",
    Normal = "Normal",
}

export enum MapToolMode{
    Hand = "Hand",
    Draw = "Draw",
}

export enum MapShapeType {
    Marker = "Marker",
    Polyline = "Polyline",
    Polygon = "Polygon",
    Circle = "Circle",
    Rectangle = "Rectangle",
    Ground = "Ground",
    Custom = "Custom",
}

export enum MapOverlayType {
    Marker = MapShapeType.Marker,
    Polyline = MapShapeType.Polyline,
    Polygon = MapShapeType.Polygon,
    Circle = MapShapeType.Circle,
    Rectangle = MapShapeType.Rectangle,
    Ground = "Ground",
    Custom = "Custom",
}

export enum MarkerIconType {
    Default = "Default",
    Text = "Text",
    // Fontawesome = "FontAwesome",
    Url = "URL",
}

export enum OverlayModalMode {
    Marker = "Marker",
    Group = "Group",
    Ungroup = "Ungroup",
    Save = "Save",
}

export enum SectionType {
    MY_PLACES = "My Places",
    MY_MAP = "My Map",
    RECENT_SEARCHES = "Recent Searches",
}

export enum MarkerAction {
    CUSTOMIZE =  "Customize",
    SAVE = "Save",
}