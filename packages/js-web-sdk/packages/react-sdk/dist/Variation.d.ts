import * as React from 'react';
export declare type VariationProps = {
    variation?: any;
    default?: any;
    children?: React.ReactNode;
};
declare class Variation extends React.Component<VariationProps, {}> {
    render(): React.ReactNode;
}
export declare const OptimizelyVariation: typeof Variation;
export {};
