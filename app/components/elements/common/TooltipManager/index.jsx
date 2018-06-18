import React from 'react';
import cn from 'classnames';
import debounce from 'lodash.debounce';

let key = 0;

export default class TooltipManager extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {};

        this._onMouseMove = debounce(this._onMouseMove, 50);
    }

    componentDidMount() {
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('resize', this._resetTooltips);
        document.addEventListener('mousedown', this._resetTooltips);
        window.addEventListener('scroll', this._resetTooltips);
    }

    componentWillUnmount() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('resize', this._resetTooltips);
        document.removeEventListener('mousedown', this._resetTooltips);
        window.removeEventListener('scroll', this._resetTooltips);

        this._resetTooltips();
    }

    render() {
        const { tooltip } = this.state;

        return (
            <div>
                {tooltip ? (
                    <div
                        key={tooltip.key}
                        className={cn('Tooltip', tooltip.addClass)}
                        style={tooltip.style}
                    >
                        {tooltip.text}
                    </div>
                ) : null}
            </div>
        );
    }

    _onMouseMove = e => {
        const tooltip = e.target.closest('[data-tooltip]');
        const text = tooltip ? tooltip.dataset.tooltip.trim() : null;

        if (tooltip && text === this._hoverText) {
            this._hoverElement = tooltip;
            return;
        }

        this._resetTooltips();

        if (tooltip && text) {
            this._hoverElement = tooltip;
            this._hoverText = text;

            this._timeout = setTimeout(() => {
                this._showTooltip();
            }, 500);
        }
    };

    _showTooltip() {
        const element = this._hoverElement;
        const bound = element.getBoundingClientRect();

        this._elementBound = bound;

        this.setState({
            tooltip: {
                key: ++key,
                text: this._hoverText,
                addClass:
                    bound.left < 100
                        ? 'Tooltip_left'
                        : bound.right > window.innerWidth - 100
                            ? 'Tooltip_right'
                            : null,
                style: {
                    top: Math.round(bound.top),
                    left: Math.round(bound.left + bound.width / 2),
                },
            },
        });

        this._checkInterval = setInterval(this._checkElement, 500);
    }

    _checkElement = () => {
        if (!this._hoverElement.isConnected) {
            this._resetTooltips();
            return;
        }

        const b = this._elementBound;
        const bound = this._hoverElement.getBoundingClientRect();

        if (b.top !== bound.top || b.left !== bound.left) {
            this._resetTooltips();
        }
    };

    _resetTooltips = () => {
        this._hoverElement = null;
        this._hoverText = null;
        this._elementBound = null;

        clearTimeout(this._timeout);

        if (this.state.tooltip) {
            this._hideTooltip();
        }
    };

    _hideTooltip() {
        clearInterval(this._checkInterval);

        this.setState({
            tooltip: null,
        });
    }
}
