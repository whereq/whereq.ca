import { SectionType } from '@/features/tools/models/ToolsEnum';
import { Sub_Module_Formatter, Sub_Module_Converter, Sub_Module_Diagram, Sub_Module_Canvas } from '@/features/tools/utils/constants';
export const Sub_Module_Path: Record<SectionType, string> = {
    [SectionType.FORMATTER]: Sub_Module_Formatter,
    [SectionType.FORMAT_CONVERTER]: Sub_Module_Converter,
    [SectionType.TEXT_DIAGRAM]: Sub_Module_Diagram,
    [SectionType.CANVAS_DRAWING]: Sub_Module_Canvas,
};