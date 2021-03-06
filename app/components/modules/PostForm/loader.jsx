import React, { PureComponent } from 'react';

let PostForm = null;

export default class PostFormLoader extends PureComponent {
    componentDidMount() {
        if (!PostForm) {
            require.ensure('./PostForm', require => {
                PostForm = require('./PostForm').default;

                if (!this._unmount) {
                    this.forceUpdate();
                }
            });
        }
    }

    componentWillUnmount() {
        this._unmount = true;
    }

    render() {
        if (PostForm) {
            return <PostForm {...this.props} />
        }

        return <div />;
    }
}
