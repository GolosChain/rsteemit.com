import React, { PureComponent } from 'react';
import WhatIsGolos from 'app/components/elements/about/WhatIsGolos/WhatIsGolos';
import LandingTeam from 'app/components/elements/about/LandingTeam/LandingTeam';
import LandingPartners from 'app/components/elements/about/LandingPartners/LandingPartners';

export default class Landing extends PureComponent {
    render() {
        return (
            <div className="Landing">
                <WhatIsGolos />
                <hr />
                <LandingTeam />
                <hr />
                <LandingPartners />
            </div>
        );
    }
}
