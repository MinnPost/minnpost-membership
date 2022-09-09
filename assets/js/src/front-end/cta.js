const button = document.querySelector('.m-support-cta-top .a-support-button');
if (button) {
	button.addEventListener('click', function (event) {
		let value = '';
		const svg = button.querySelector('svg');
		if (null !== svg) {
			const attribute = svg.getAttribute('title');
			if (null !== attribute) {
				value = attribute + ' ';
			}
		}
		value = value + button.textContent;
		wp.hooks.doAction(
			'minnpostMembershipAnalyticsEvent',
			'event',
			'Support CTA - Header',
			'Click: ' + value,
			location.pathname
		);
	});
}
