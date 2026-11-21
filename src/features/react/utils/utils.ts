import { SectionType } from '@/features/react/models/ReactEnum';
import {
    Sub_Module_SearchBox,
    Sub_Module_Tag,
    Sub_Module_Toast,
    Sub_Module_Avatar,
    Sub_Module_Scrollbar,
    Sub_Module_CountryFlag,
} from '@/features/react/utils/constants';

/** The breadcrumb segment for each child page. */
export const Sub_Module_Path: Record<SectionType, string> = {
    [SectionType.SEARCH_BOX]: Sub_Module_SearchBox,
    [SectionType.TAG]: Sub_Module_Tag,
    [SectionType.TOAST]: Sub_Module_Toast,
    [SectionType.AVATAR]: Sub_Module_Avatar,
    [SectionType.SCROLLBAR]: Sub_Module_Scrollbar,
    [SectionType.COUNTRY_FLAG]: Sub_Module_CountryFlag,
};
