import React, { Component } from 'react';
import PropTypes from 'prop-types'
import { connect } from 'react-redux';
import cn from 'classnames';
import CircularProgress from './CircularProgress'
import shouldComponentUpdate from 'app/utils/shouldComponentUpdate';
import proxifyImageUrl from 'app/utils/ProxifyUrl';

class Userpic extends Component {
    static propTypes = {
        account: PropTypes.string,
        votingPower: PropTypes.number,
        showProgress: PropTypes.bool,
        progressClass: PropTypes.string,
        imageUrl: PropTypes.string,
        size: PropTypes.number,
    }

    static defaultProps = {
        size: 48,
        hideIfDefault: false,
        showProgress: false
    }

    state = {
        showProgress: this.props.showProgress,
        showPower: false
    }

    shouldComponentUpdate = shouldComponentUpdate(this, 'Userpic')

    extractUrl = () => {
        const { json_metadata, size, hideIfDefault, imageUrl } = this.props

        let url = null;

        // TODO: Rewrite bottom block

        if (imageUrl) {
            url = imageUrl
        } else {
            // try to extract image url from users metaData
            try {
                const md = JSON.parse(json_metadata);
                if (md.profile) url = md.profile.profile_image;
            } catch (e) {
                console.warn('Try to extract image url from users metaData failed!')
            }
        }

        if (url && /^(https?:)\/\//.test(url)) {
            url = proxifyImageUrl(url, size && size > 120 ? '320x320' : '120x120');
        } else {
            if (hideIfDefault) {
                return null;
            }
            url = require('app/assets/images/user.png');
        }

        return url
    }

    votingPowerToPercents = power => power / 100

    toggleProgress = () => this.setState({
        showProgress: !this.state.showProgress,
        showPower: !this.state.showPower
    })

    getVotingIndicator = (percentage) => {
        const { progressClass } = this.props
        const { showProgress, showPower } = this.state

        const votingClasses = cn('voting_power', {
            'show-progress': showProgress,
            'show-power': showPower
        }, progressClass)

        return (
            <div className={votingClasses}>
                <CircularProgress
                    percentage={percentage}
                    show={showProgress}
                    size={this.props.size}
                    strokeWidth={2.5}
                />
            </div>
        )
    }

    render() {
        const { size, votingPower, showProgress } = this.props

        const style = {
            width: size,
            height: size,
            backgroundImage: `url(${this.extractUrl()})`
        }

        if (votingPower) {
            const percentage = this.votingPowerToPercents(votingPower)
            const toggle = showProgress ? () => { } : this.toggleProgress

            return (
                <div className="Userpic" onClick={toggle} style={style}>
                    {percentage ? this.getVotingIndicator(percentage) : null}
                </div>
            )
        } else {
            return <div className="Userpic" style={style} />
        }
    }
}

export default connect(
    (state, ownProps) => {
        const { account, hideIfDefault } = ownProps;
        return {
            json_metadata: state.global.getIn(['accounts', account, 'json_metadata']),
            hideIfDefault,
        }
    }
)(Userpic)
