function toggleActionFields(parent) {
	$('td', parent).attr('colspan', '2');
	$('th', parent).hide();
	$('.checkbox', parent).wrapAll('<div class="checkbox-tab-wrap">');

	const $toggle = $('input[type="radio"]', $(parent));

	$($toggle).each(function () {
		$('.minnpost-member-field-' + $(this).val()).wrapAll(
			'<tr class="minnpost-member-fields-wrap minnpost-member-fields-wrap-' +
				$(this).val() +
				'"><td colspan="2"><table />'
		);
		$('.minnpost-member-fields-wrap').hide();
	});

	if ($toggle.is(':checked')) {
		$(
			'.minnpost-member-fields-wrap-' +
				$('input[type="radio"]:checked', $(parent)).val()
		).show();
	}
	$toggle.on('click', function (e) {
		const checkbox = $(this);

		$('.minnpost-member-fields-wrap').hide();

		if (checkbox.is(':checked')) {
			$('.minnpost-member-fields-wrap-' + $(this).val()).show();
		}
	});
}
