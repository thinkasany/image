import type { IDialogPropTypes } from '@rc-component/dialog/lib/IDialogPropTypes';
import type { GetContainer } from '@rc-component/util/lib/PortalWrapper';
import useMergedState from '@rc-component/util/lib/hooks/useMergedState';
import cn from 'classnames';
import * as React from 'react';
import { useContext, useMemo, useState } from 'react';
import type { PreviewProps, ToolbarRenderInfoType } from './Preview';
import Preview from './Preview';
import PreviewGroup from './PreviewGroup';
import { COMMON_PROPS } from './common';
import { PreviewGroupContext } from './context';
import type { TransformType } from './hooks/useImageTransform';
import useRegisterImage from './hooks/useRegisterImage';
import useStatus from './hooks/useStatus';
import type { ImageElementProps } from './interface';
import { getOffset } from './util';

export interface ImgInfo {
  url: string;
  alt: string;
  width: string | number;
  height: string | number;
}

export interface ImagePreviewType
  extends Omit<
    IDialogPropTypes,
    'mask' | 'visible' | 'closable' | 'prefixCls' | 'onClose' | 'afterClose' | 'wrapClassName'
  > {
  src?: string;
  visible?: boolean;
  minScale?: number;
  maxScale?: number;
  onVisibleChange?: (value: boolean, prevValue: boolean) => void;
  getContainer?: GetContainer | false;
  mask?: React.ReactNode;
  maskClassName?: string;
  classNames?: Partial<Record<SemanticName, string>>;
  styles?: Partial<Record<SemanticName, React.CSSProperties>>;
  icons?: PreviewProps['icons'];
  scaleStep?: number;
  movable?: boolean;
  imageRender?: (
    originalNode: React.ReactElement,
    info: { transform: TransformType; image: ImgInfo },
  ) => React.ReactNode;
  onTransform?: PreviewProps['onTransform'];
  toolbarRender?: (
    originalNode: React.ReactElement,
    info: Omit<ToolbarRenderInfoType, 'current' | 'total'>,
  ) => React.ReactNode;
}

export type SemanticName = 'root' | 'actions' | 'mask';

export interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'placeholder' | 'onClick'> {
  // Original
  src?: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  prefixCls?: string;
  previewPrefixCls?: string;
  placeholder?: React.ReactNode;
  fallback?: string;
  rootClassName?: string;
  preview?: boolean | ImagePreviewType;
  /**
   * @deprecated since version 3.2.1
   */
  onPreviewClose?: (value: boolean, prevValue: boolean) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

interface CompoundedComponent<P> extends React.FC<P> {
  PreviewGroup: typeof PreviewGroup;
}

const ImageInternal: CompoundedComponent<ImageProps> = props => {
  const {
    src: imgSrc,
    alt,
    onPreviewClose: onInitialPreviewClose,
    prefixCls = 'rc-image',
    previewPrefixCls = `${prefixCls}-preview`,
    placeholder,
    fallback,
    width,
    height,
    style,
    preview = true,
    className,
    onClick,
    onError,
    wrapperClassName,
    wrapperStyle,
    rootClassName,
    ...otherProps
  } = props;

  const isCustomPlaceholder = placeholder && placeholder !== true;
  const {
    src: previewSrc,
    visible: previewVisible = undefined,
    onVisibleChange: onPreviewVisibleChange = onInitialPreviewClose,
    getContainer: getPreviewContainer = undefined,
    mask: previewMask,
    maskClassName,
    classNames: imageClassNames,
    styles,
    movable,
    icons,
    scaleStep,
    minScale,
    maxScale,
    imageRender,
    toolbarRender,
    ...dialogProps
  }: ImagePreviewType = typeof preview === 'object' ? preview : {};
  const src = previewSrc ?? imgSrc;
  const [isShowPreview, setShowPreview] = useMergedState(!!previewVisible, {
    value: previewVisible,
    onChange: onPreviewVisibleChange,
  });
  const [getImgRef, srcAndOnload, status] = useStatus({
    src: imgSrc,
    isCustomPlaceholder,
    fallback,
  });
  const [mousePosition, setMousePosition] = useState<null | { x: number; y: number }>(null);

  const groupContext = useContext(PreviewGroupContext);

  const canPreview = !!preview;

  const onPreviewClose = () => {
    setShowPreview(false);
    setMousePosition(null);
  };

  const wrapperClass = cn(prefixCls, wrapperClassName, rootClassName, {
    [`${prefixCls}-error`]: status === 'error',
  });

  // ========================= ImageProps =========================
  const imgCommonProps = useMemo(
    () => {
      const obj: ImageElementProps = {};
      COMMON_PROPS.forEach((prop: any) => {
        if (props[prop] !== undefined) {
          obj[prop] = props[prop];
        }
      });

      return obj;
    },
    COMMON_PROPS.map(prop => props[prop]),
  );

  // ========================== Register ==========================
  const registerData: ImageElementProps = useMemo(
    () => ({
      ...imgCommonProps,
      src,
    }),
    [src, imgCommonProps],
  );

  const imageId = useRegisterImage(canPreview, registerData);

  // ========================== Preview ===========================
  const onPreview: React.MouseEventHandler<HTMLDivElement> = e => {
    const { left, top } = getOffset(e.target as HTMLDivElement);
    if (groupContext) {
      groupContext.onPreview(imageId, src, left, top);
    } else {
      setMousePosition({
        x: left,
        y: top,
      });
      setShowPreview(true);
    }

    onClick?.(e);
  };

  // =========================== Render ===========================
  return (
    <>
      <div
        {...otherProps}
        className={wrapperClass}
        onClick={canPreview ? onPreview : onClick}
        style={{
          width,
          height,
          ...wrapperStyle,
        }}
      >
        <img
          {...imgCommonProps}
          className={cn(
            `${prefixCls}-img`,
            {
              [`${prefixCls}-img-placeholder`]: placeholder === true,
            },
            className,
          )}
          style={{
            height,
            ...style,
          }}
          ref={getImgRef}
          {...srcAndOnload}
          width={width}
          height={height}
          onError={onError}
        />

        {status === 'loading' && (
          <div aria-hidden="true" className={`${prefixCls}-placeholder`}>
            {placeholder}
          </div>
        )}

        {/* Preview Click Mask */}
        {previewMask && canPreview && (
          <div
            className={cn(`${prefixCls}-mask`, maskClassName, imageClassNames?.mask)}
            style={{
              display: style?.display === 'none' ? 'none' : undefined,
              ...styles?.mask,
            }}
          >
            {previewMask}
          </div>
        )}
      </div>
      {!groupContext && canPreview && (
        <Preview
          aria-hidden={!isShowPreview}
          visible={isShowPreview}
          prefixCls={previewPrefixCls}
          onClose={onPreviewClose}
          mousePosition={mousePosition}
          src={src}
          alt={alt}
          imageInfo={{ width, height }}
          fallback={fallback}
          getContainer={getPreviewContainer}
          icons={icons}
          movable={movable}
          scaleStep={scaleStep}
          minScale={minScale}
          maxScale={maxScale}
          rootClassName={rootClassName}
          imageRender={imageRender}
          imgCommonProps={imgCommonProps}
          toolbarRender={toolbarRender}
          classNames={imageClassNames}
          styles={styles}
          {...dialogProps}
        />
      )}
    </>
  );
};

ImageInternal.PreviewGroup = PreviewGroup;

if (process.env.NODE_ENV !== 'production') {
  ImageInternal.displayName = 'Image';
}

export default ImageInternal;
