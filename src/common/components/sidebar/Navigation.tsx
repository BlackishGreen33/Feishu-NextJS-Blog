import { useSiteConfig } from '@/common/config/site';
import { useMenuData } from '@/common/constant/menu';

import Menu from './Menu';
import Breakline from '../elements/Breakline';

const Navigation = () => {
  const site = useSiteConfig();
  const { menuItems, appItems } = useMenuData();
  const filteredMenu = menuItems.filter((item) => item?.isShow);
  const filteredAppsMenu = appItems.filter((item) => item?.isShow);

  return (
    <>
      <Menu list={filteredMenu} />
      <Breakline className='mx-1' />
      <div className='space-y-1'>
        <div className='px-4'>
          <span className='text-sm text-neutral-600'>
            {site.navGroupLabels.apps}
          </span>
        </div>
        <Menu list={filteredAppsMenu} />
      </div>
    </>
  );
};

export default Navigation;
