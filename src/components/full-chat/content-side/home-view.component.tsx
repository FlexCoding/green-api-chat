import { FC } from 'react';

import { Flex, Image, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from 'hooks';
import { selectBrandImgUrl, selectDescription } from 'store/slices/chat.slice';

const HomeView: FC = () => {
  const { t } = useTranslation();

  const description = useAppSelector(selectDescription);
  const brandImgUrl = useAppSelector(selectBrandImgUrl);

  return (
    <Flex className="home-view" align="center" justify="center">
      <Space direction="vertical" align="center" style={{ textAlign: 'center' }}>
        {brandImgUrl && <Image src={brandImgUrl} alt="" width={350} preview={false} />}
        <Typography.Text style={{ fontSize: 20 }}>{description || t('LOGO_TITLE')}</Typography.Text>
      </Space>
    </Flex>
  );
};

export default HomeView;
