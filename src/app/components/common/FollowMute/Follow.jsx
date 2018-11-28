import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Set, Map } from 'immutable';
import tt from 'counterpart';

import Button from 'golos-ui/Button';
import Icon from 'golos-ui/Icon';

import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import { confirmUnfollowDialog } from 'src/app/redux/actions/dialogs';
import { updateFollow } from 'src/app/redux/actions/follow';

const ButtonStyled = styled(Button)`
    &:not(:last-child) {
        margin-right: 8px;
    }

    @media (max-width: 890px) {
        height: 30px;
    }
`;

const IconStyled = styled(Icon)`
    margin-right: 10px;
`;

class Follow extends Component {
    static propTypes = {
        following: PropTypes.string,
        follower: PropTypes.string, // OPTIONAL default to current user
        showFollow: PropTypes.bool,
        showMute: PropTypes.bool,
        children: PropTypes.any,
    };

    static defaultProps = {
        showFollow: true,
        showMute: true,
    };

    state = {
        busy: false,
    };

    handleUpdateFollow(type) {
        if (this.state.busy) {
            return;
        }

        const { follower, following } = this.props;

        this.setState({ busy: true });

        this.props.updateFollow(follower, following, type, () => {
            this.setState({ busy: false });
        });
    }

    follow = () => {
        this.handleUpdateFollow('blog');
    };

    unfollow = () => {
        this.props.confirmUnfollowDialog(this.props.following);
    };

    ignore = () => {
        this.handleUpdateFollow('ignore');
    };

    unignore = () => {
        this.handleUpdateFollow(null);
    };

    render() {
        const { loading } = this.props;

        if (loading) {
            return (
                <span>
                    <LoadingIndicator /> {tt('g.loading')}
                    &hellip;
                </span>
            );
        }

        if (loading !== false) {
            // must know what the user is already following before any update can happen
            return null;
        }

        const { follower, following } = this.props;
        // Show follow preview for new users
        if (!follower || !following)
            return (
                <ButtonStyled onClick={this.follow}>
                    <IconStyled name="plus" height="14" width="14" />
                    {tt('g.follow')}
                </ButtonStyled>
            );

        // Can't follow or ignore self
        if (follower === following) {
            return null;
        }

        const { showFollow, showMute, children, followingWhat } = this.props;
        const { busy } = this.state;

        return (
            <Fragment>
                {showFollow && followingWhat !== 'blog' ? (
                    <ButtonStyled disabled={busy} onClick={this.follow}>
                        <IconStyled name="plus" height="14" width="14" />
                        {tt('g.follow')}
                    </ButtonStyled>
                ) : (
                    <ButtonStyled disabled={busy} light onClick={this.unfollow}>
                        <IconStyled name="tick" height="10" width="14" />
                        {tt('g.subscriptions')}
                    </ButtonStyled>
                )}

                {showMute && followingWhat !== 'ignore' ? (
                    <ButtonStyled disabled={busy} onClick={this.ignore}>
                        {tt('g.mute')}
                    </ButtonStyled>
                ) : (
                    <ButtonStyled disabled={busy} light onClick={this.unignore}>
                        {tt('g.unmute')}
                    </ButtonStyled>
                )}

                {children ? (
                    <span>
                        &nbsp;&nbsp;
                        {children}
                    </span>
                ) : null}
            </Fragment>
        );
    }
}

const emptyMap = Map();
const emptySet = Set();

export default connect(
    (state, ownProps) => {
        let { follower } = ownProps;

        if (!follower) {
            const current_user = state.user.get('current');
            follower = current_user ? current_user.get('username') : null;
        }

        const { following } = ownProps;
        const follow = state.global.getIn(['follow', 'getFollowingAsync', follower], emptyMap);
        const loading = follow.get('blog_loading', false) || follow.get('ignore_loading', false);

        let followingWhat;

        if (follow.get('blog_result', emptySet).contains(following)) {
            followingWhat = 'blog';
        } else if (follow.get('ignore_result', emptySet).contains(following)) {
            followingWhat = 'ignore';
        } else {
            followingWhat = null;
        }

        return {
            follower,
            following,
            followingWhat,
            loading,
        };
    },
    {
        updateFollow,
        confirmUnfollowDialog,
    }
)(Follow);
