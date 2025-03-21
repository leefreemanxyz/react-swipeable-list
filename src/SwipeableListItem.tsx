import { PureComponent, ReactNode } from "react";

import "./SwipeableListItem.css";

export const ActionAnimations = {
  RETURN: Symbol("Return"),
  REMOVE: Symbol("Remove"),
  NONE: Symbol("None"),
};

export enum ActionAnimationsEnum {
  /**
   * Item returns to start position.
   */
  RETURN,
  /**
   * Item moves out of the screen.
   */
  REMOVE,
  /**
   * Item stays in place it was dragged to.
   */
  NONE,
}

interface ISwipeActionProps {
  /**
   * Callback function that should be run when swipe is done beyond threshold.
   */
  action: () => void;
  /**
   * default: `RETURN`
   *
   * Animation type to be played swipe is done beyond threshold.
   */
  actionAnimation?: ActionAnimationsEnum;
  /**
   * Content that is revealed when swiping.
   */
  content: ReactNode;
}

interface ISwipeableListItemProps {
  /**
   * default: `false`
   *
   * If set to `true` all defined swipe actions are blocked.
   */
  blockSwipe?: boolean;
  /**
   * Content that is visible by default and swipeable to reveal the left and right views.
   */
  children: ReactNode;
  /**
   * Data for defining left swipe action and rendering content after item is swiped.
   */
  swipeLeft?: ISwipeActionProps;
  /**
   * Data for defining right swipe action and rendering content after item is swiped.
   */
  swipeRight?: ISwipeActionProps;
  /**
   * default: `10`
   *
   * How far in pixels scroll needs to be done to block swiping. After scrolling is started and goes beyond the threshold, swiping is blocked.
   *
   * It can be set for the whole list or for every item. See `scrollStartThreshold` for `SwipeableList`. Value from the `SwipeableListItem` takes precedence.
   */
  scrollStartThreshold?: number;
  /**
   * default: `10`
   *
   * How far in pixels swipe needs to be done to start swiping on list item. After a swipe is started and goes beyond the threshold, scrolling is blocked.
   *
   * It can be set for the whole list or for every item. See `swipeStartThreshold` for `SwipeableList`. Value from the `SwipeableListItem` takes precedence.
   */
  swipeStartThreshold?: number;
  /**
   * default: `0.5`
   *
   * How far swipe needs to be done to trigger attached action. `0.5` means that item needs to be swiped to half of its width, `0.25` - one-quarter of width.
   *
   * It can be set for the whole list or for every item. See `threshold` for `SwipeableList`. Value from the `SwipeableListItem` takes precedence.
   */
  threshold?: number;
  /**
   * Fired after swipe has started (after drag gesture passes the `swipeStartThreshold` distance in pixels).
   */
  onSwipeStart?: () => void;
  /**
   * Fired after swipe has ended.
   */
  onSwipeEnd?: () => void;
  /**
   * Fired every time swipe progress changes. The reported `progress` value is always an integer in range 0 to 100 inclusive.
   */
  onSwipeProgress?: (progress: number) => void;
}


const DragDirection = {
  UP: 1,
  DOWN: 2,
  LEFT: 3,
  RIGHT: 4,
  UNKNOWN: 5,
};

const FPS_INTERVAL = 1000 / 60;

class SwipeableListItem extends PureComponent {
  constructor(props: ISwipeableListItemProps) {
    super(props);

    this.contentLeft = null;
    this.contentRight = null;
    this.listElement = null;
    this.requestedAnimationFrame = null;
    this.wrapper = null;

    this.startTime = null;

    this.previousSwipeDistancePercent = 0;

    this.resetState();
  }

  resetState = () => {
    this.dragStartPoint = { x: -1, y: -1 };
    this.dragDirection = DragDirection.UNKNOWN;
    this.left = 0;
    this.previousSwipeDistancePercent = 0;
  };

  get dragHorizontalDirectionThreshold() {
    return this.props.swipeStartThreshold || 10;
  }

  get dragVerticalDirectionThreshold() {
    return this.props.scrollStartThreshold || 10;
  }

  componentDidMount() {
    this.wrapper.addEventListener("mousedown", this.handleDragStartMouse);

    this.wrapper.addEventListener("touchstart", this.handleDragStartTouch);
    this.wrapper.addEventListener("touchend", this.handleDragEndTouch);
    this.wrapper.addEventListener("touchmove", this.handleTouchMove, {
      capture: true,
      passive: false,
    });
  }

  componentWillUnmount() {
    if (this.requestedAnimationFrame) {
      cancelAnimationFrame(this.requestedAnimationFrame);

      this.requestedAnimationFrame = null;
    }

    this.wrapper.removeEventListener("mousedown", this.handleDragStartMouse);

    this.wrapper.removeEventListener("touchstart", this.handleDragStartTouch);
    this.wrapper.removeEventListener("touchend", this.handleDragEndTouch);
    this.wrapper.removeEventListener("touchmove", this.handleTouchMove, {
      capture: true,
      passive: false,
    });
  }

  handleDragStartMouse = (event) => {
    window.addEventListener("mouseup", this.handleDragEndMouse);
    window.addEventListener("mousemove", this.handleMouseMove);

    this.wrapper.addEventListener("mouseup", this.handleDragEndMouse);
    this.wrapper.addEventListener("mousemove", this.handleMouseMove);

    this.handleDragStart(event);
  };

  handleDragStartTouch = (event) => {
    window.addEventListener("touchend", this.handleDragEndTouch);

    const touch = event.targetTouches[0];
    this.handleDragStart(touch);
  };

  handleDragStart = ({ clientX, clientY }) => {
    this.resetState();
    this.dragStartPoint = { x: clientX, y: clientY };

    this.listElement.className = "swipeable-list-item__content";
    if (this.contentLeft !== null) {
      this.contentLeft.className = "swipeable-list-item__content-left";
    }

    if (this.contentRight !== null) {
      this.contentRight.className = "swipeable-list-item__content-right";
    }

    this.startTime = Date.now();
    this.scheduleUpdatePosition();
  };

  handleMouseMove = (event) => {
    if (this.dragStartedWithinItem()) {
      const { clientX, clientY } = event;

      this.setDragDirection(clientX, clientY);

      if (this.isSwiping()) {
        event.stopPropagation();
        event.preventDefault();

        this.left = clientX - this.dragStartPoint.x;
        this.scheduleUpdatePosition();
      }
    }
  };

  handleTouchMove = (event) => {
    if (this.dragStartedWithinItem()) {
      const { clientX, clientY } = event.targetTouches[0];

      this.setDragDirection(clientX, clientY);

      if (!event.cancelable) {
        return;
      }

      if (this.isSwiping()) {
        event.stopPropagation();
        event.preventDefault();

        this.left = clientX - this.dragStartPoint.x;
        this.scheduleUpdatePosition();
      }
    }
  };

  handleDragEndMouse = () => {
    window.removeEventListener("mouseup", this.handleDragEndMouse);
    window.removeEventListener("mousemove", this.handleMouseMove);

    if (this.wrapper) {
      this.wrapper.removeEventListener("mouseup", this.handleDragEndMouse);
      this.wrapper.removeEventListener("mousemove", this.handleMouseMove);
    }

    this.handleDragEnd();
  };

  handleDragEndTouch = () => {
    window.removeEventListener("touchend", this.handleDragEndTouch);

    this.handleDragEnd();
  };

  playReturnAnimation = () => {
    const { contentLeft, contentRight, listElement } = this;

    if (listElement) {
      listElement.className =
        "swipeable-list-item__content swipeable-list-item__content--return";
      listElement.style.transform = "translateX(0px)";
    }

    // hide backgrounds
    if (contentLeft !== null) {
      contentLeft.style.opacity = 0;
      contentLeft.className =
        "swipeable-list-item__content-left swipeable-list-item__content-left--return";
    }

    if (contentRight !== null) {
      contentRight.style.opacity = 0;
      contentRight.className =
        "swipeable-list-item__content-right swipeable-list-item__content-right--return";
    }
  };

  playRemoveAnimation = (direction) => {
    const { listElement } = this;

    if (listElement) {
      listElement.className =
        "swipeable-list-item__content swipeable-list-item__content--remove";
      listElement.style.transform = `translateX(${listElement.offsetWidth * (direction === DragDirection.LEFT ? -1 : 1)
        }px)`;
    }
  };

  playActionAnimation = (type, direction) => {
    const { listElement } = this;

    if (listElement) {
      switch (type) {
        case ActionAnimations.REMOVE:
          this.playRemoveAnimation(direction);
          break;
        case ActionAnimations.NONE:
          break;
        default:
          this.playReturnAnimation();
      }
    }
  };

  handleDragEnd = () => {
    const { left, listElement, props } = this;
    const { swipeLeft, swipeRight, threshold = 0.5 } = props;
    let actionTriggered = false;

    if (this.isSwiping()) {
      if (listElement) {
        if (left < listElement.offsetWidth * threshold * -1) {
          this.playActionAnimation(
            swipeLeft.actionAnimation,
            DragDirection.LEFT,
          );
          this.handleSwipedLeft();
          actionTriggered = true;
        } else if (left > listElement.offsetWidth * threshold) {
          this.playActionAnimation(
            swipeRight.actionAnimation,
            DragDirection.RIGHT,
          );
          this.handleSwipedRight();
          actionTriggered = true;
        }
      }

      if (this.props.onSwipeEnd) {
        this.props.onSwipeEnd();
      }
    }

    this.resetState();

    if (!actionTriggered) {
      this.playReturnAnimation();
    }
  };

  dragStartedWithinItem = () => {
    const { x, y } = this.dragStartPoint;

    return x !== -1 && y !== -1;
  };

  setDragDirection = (x, y) => {
    if (this.dragDirection === DragDirection.UNKNOWN) {
      const { x: startX, y: startY } = this.dragStartPoint;
      const horizontalDistance = Math.abs(x - startX);
      const verticalDistance = Math.abs(y - startY);

      if (
        horizontalDistance <= this.dragHorizontalDirectionThreshold &&
        verticalDistance <= this.dragVerticalDirectionThreshold
      ) {
        return;
      }

      const angle = Math.atan2(y - startY, x - startX);
      const octant = Math.round((8 * angle) / (2 * Math.PI) + 8) % 8;

      switch (octant) {
        case 0:
          if (
            this.contentRight !== null &&
            horizontalDistance > this.dragHorizontalDirectionThreshold
          ) {
            this.dragDirection = DragDirection.RIGHT;
          }
          break;
        case 1:
        case 2:
        case 3:
          if (verticalDistance > this.dragVerticalDirectionThreshold) {
            this.dragDirection = DragDirection.DOWN;
          }
          break;
        case 4:
          if (
            this.contentLeft !== null &&
            horizontalDistance > this.dragHorizontalDirectionThreshold
          ) {
            this.dragDirection = DragDirection.LEFT;
          }
          break;
        case 5:
        case 6:
        case 7:
          if (verticalDistance > this.dragVerticalDirectionThreshold) {
            this.dragDirection = DragDirection.UP;
          }
          break;
      }

      if (this.props.onSwipeStart && this.isSwiping()) {
        this.props.onSwipeStart();
      }
    }
  };

  isSwiping = () => {
    const { blockSwipe } = this.props;
    const horizontalDrag =
      this.dragDirection === DragDirection.LEFT ||
      this.dragDirection === DragDirection.RIGHT;

    return !blockSwipe && this.dragStartedWithinItem() && horizontalDrag;
  };

  scheduleUpdatePosition = () => {
    if (this.requestedAnimationFrame) {
      return;
    }

    this.requestedAnimationFrame = requestAnimationFrame(() => {
      this.requestedAnimationFrame = null;

      this.updatePosition();
    });
  };

  get onlyLeftContent() {
    return this.contentLeft !== null && this.contentRight === null;
  }

  get onlyRightContent() {
    return this.contentLeft === null && this.contentRight !== null;
  }

  updatePosition = () => {
    const now = Date.now();
    const elapsed = now - this.startTime;

    if (elapsed > FPS_INTERVAL && this.isSwiping()) {
      let contentToShow = this.left < 0 ? this.contentLeft : this.contentRight;

      if (this.onlyLeftContent && this.left > 0) {
        this.left = 0;
        contentToShow = this.contentLeft;
      }

      if (this.onlyRightContent && this.left < 0) {
        this.left = 0;
        contentToShow = this.contentRight;
      }

      if (!contentToShow) {
        return;
      }

      if (this.listElement) {
        this.listElement.style.transform = `translateX(${this.left}px)`;
      }

      const opacity = (Math.abs(this.left) / 100).toFixed(2);

      if (this.props.onSwipeProgress && this.listElement) {
        const listElementWidth = this.listElement.offsetWidth;
        let swipeDistancePercent = this.previousSwipeDistancePercent;

        if (listElementWidth !== 0) {
          const swipeDistance = Math.max(
            0,
            listElementWidth - Math.abs(this.left),
          );

          swipeDistancePercent =
            100 - Math.round((100 * swipeDistance) / listElementWidth);
        }

        if (this.previousSwipeDistancePercent !== swipeDistancePercent) {
          this.props.onSwipeProgress(swipeDistancePercent);
          this.previousSwipeDistancePercent = swipeDistancePercent;
        }
      }

      if (opacity < 1 && opacity.toString() !== contentToShow.style.opacity) {
        contentToShow.style.opacity = opacity.toString();

        let contentToHide =
          this.left < 0 ? this.contentRight : this.contentLeft;

        if (contentToHide) {
          contentToHide.style.opacity = "0";
        }
      }

      if (opacity >= 1) {
        contentToShow.style.opacity = "1";
      }

      this.startTime = Date.now();
    }
  };

  handleSwipedLeft = () => {
    const { swipeLeft: { action } = {} } = this.props;

    if (action) {
      action();
    }
  };

  handleSwipedRight = () => {
    const { swipeRight: { action } = {} } = this.props;

    if (action) {
      action();
    }
  };

  bindContentLeft = (ref) => (this.contentLeft = ref);
  bindContentRight = (ref) => (this.contentRight = ref);
  bindListElement = (ref) => (this.listElement = ref);
  bindWrapper = (ref) => (this.wrapper = ref);

  render() {
    const { children, swipeLeft, swipeRight } = this.props;

    return (
      <div className="swipeable-list-item" ref={this.bindWrapper}>
        {swipeLeft && (
          <div
            className="swipeable-list-item__content-left"
            data-testid="swipe-left-content"
            ref={this.bindContentLeft}
          >
            {swipeLeft.content}
          </div>
        )}
        {swipeRight && (
          <div
            className="swipeable-list-item__content-right"
            data-testid="swipe-right-content"
            ref={this.bindContentRight}
          >
            {swipeRight.content}
          </div>
        )}
        <div
          className="swipeable-list-item__content"
          data-testid="content"
          ref={this.bindListElement}
        >
          {children}
        </div>
      </div>
    );
  }
}

interface SwipeableListItemProps {
  blockSwipe?: boolean;
  children: React.ReactNode;
  swipeLeft?: SwipeAction;
  swipeRight?: SwipeAction;
  scrollStartThreshold?: number;
  swipeStartThreshold?: number;
  threshold?: number;
  onSwipeEnd?: () => void;
  onSwipeProgress?: (progress: number) => void;
  onSwipeStart?: () => void;
}

export default SwipeableListItem;
