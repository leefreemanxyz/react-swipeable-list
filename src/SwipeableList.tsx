import React, { ReactNode } from "react";

import "./SwipeableList.css";

interface IBaseSwipeableListProps {
  /**
   * default: `10`
   *
   * How far in pixels scroll needs to be done to block swiping. After scrolling is started and goes beyond the threshold, swiping is blocked.
   *
   * It can be set for the whole list or for every item. See `scrollStartThreshold` for `SwipeableListItem`. Value from the `SwipeableListItem` takes precedence.
   */
  scrollStartThreshold?: number;
  /**
   * default: `10`
   *
   * How far in pixels swipe needs to be done to start swiping on list item. After a swipe is started and goes beyond the threshold, scrolling is blocked.
   *
   * It can be set for the whole list or for every item. See `swipeStartThreshold` for `SwipeableListItem`. Value from the `SwipeableListItem` takes precedence.
   */
  swipeStartThreshold?: number;
  /**
   * default: `0.5`
   *
   * How far swipe needs to be done to trigger attached action. `0.5` means that item needs to be swiped to half of its width, `0.25` - one-quarter of width.
   *
   * It can be set for the whole list or for every item. See `threshold` for `SwipeableListItem`. Value from the `SwipeableListItem` takes precedence.
   */
  threshold?: number;
}

interface IStyledSwipeableListProps extends IBaseSwipeableListProps {
  className: string;
}

type SwipeableListChildren =
  | ReactNode
  | ((props: IStyledSwipeableListProps) => ReactNode);

interface ISwipeableListProps extends IBaseSwipeableListProps {
  /**
   * A function child can be used instead of a SwipeableListItem elements. This function is
   * called with the SwipeableList props (scrollStartThreshold, swipeStartThreshold, threshold),
   * which can be used to apply context specific props to a component.
   * ```jsx
   *   <SwipeableList threshold={0.5}>
   *     {props => (
   *        <SwipeableListItme {...props} />
   *     )}
   *   </SwipeableList>
   * ```
   */
  children?: SwipeableListChildren;
}

const SwipeableList = ({
  children,
  scrollStartThreshold,
  swipeStartThreshold,
  threshold,
}: ISwipeableListProps) =>
  typeof children === "function" ? (
    children({
      className: "swipeable-list",
      scrollStartThreshold,
      swipeStartThreshold,
      threshold,
    })
  ) : (
    <div className="swipeable-list">
      {React.Children.map(
        children,
        (child) =>
          React.isValidElement(child) &&
          React.cloneElement(child, {
            scrollStartThreshold,
            swipeStartThreshold,
            threshold,
          }),
      )}
    </div>
  );

export default SwipeableList;
