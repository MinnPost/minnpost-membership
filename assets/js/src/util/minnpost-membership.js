(function (window) {
	function MinnPostMembership(data, settings) {
		this.data = {};
		if (typeof data !== 'undefined') {
			this.data = data;
		}

		this.settings = {};
		if (typeof settings !== 'undefined') {
			this.settings = settings;
		}

		this.previousAmount = '';
		if (
			typeof this.data.current_user !== 'undefined' &&
			typeof this.data.current_user.previous_amount !== 'undefined'
		) {
			this.previousAmount = this.data.current_user.previous_amount;
		}
	}

	MinnPostMembership.prototype = {
		checkLevel(amount, frequency, type) {
			let thisyear = parseInt(amount) * parseInt(frequency);
			if (
				typeof this.previousAmount !== 'undefined' &&
				this.previousAmount !== ''
			) {
				let prior_year_amount = parseInt(
					this.previousAmount.prior_year_contributions,
					10
				);
				const coming_year_amount = parseInt(
					this.previousAmount.coming_year_contributions,
					10
				);
				let annual_recurring_amount = parseInt(
					this.previousAmount.annual_recurring_amount,
					10
				);
				// calculate member level formula
				if (type === 'one-time') {
					prior_year_amount += thisyear;
				} else {
					annual_recurring_amount += thisyear;
				}

				thisyear = Math.max(
					prior_year_amount,
					coming_year_amount,
					annual_recurring_amount
				);
			}

			return this.getLevel(thisyear);
		}, // end checkLevel

		getLevel(thisyear) {
			const level = {
				yearlyAmount: thisyear,
			};
			if (thisyear > 0 && thisyear < 60) {
				level.name = 'Bronze';
				level.number = 1;
			} else if (thisyear > 59 && thisyear < 120) {
				level.name = 'Silver';
				level.number = 2;
			} else if (thisyear > 119 && thisyear < 240) {
				level.name = 'Gold';
				level.number = 3;
			} else if (thisyear > 239) {
				level.name = 'Platinum';
				level.number = 4;
			}
			return level;
		}, // end getLevel
	};

	window.MinnPostMembership = new MinnPostMembership(
		window.minnpost_membership_data,
		window.minnpost_membership_settings
	);
})(window);
