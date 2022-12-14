(function ($) {
	function benefitForm() {
		if (
			'back_forward' ===
			performance.getEntriesByType('navigation')[0].type
		) {
			location.reload(true);
		}
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			event.preventDefault();
			const $button = $(this);
			const $status = $('.m-benefit-message', $(this).parent());
			const $select = $('select', $(this).parent());
			const settings = minnpost_membership_settings;
			// reset the message for current status
			if (!'.m-benefit-message-success') {
				$('.m-benefit-message').removeClass(
					'm-benefit-message-visible m-benefit-message-error m-benefit-message-info'
				);
			}
			// set button to processing
			$button.text('Processing').addClass('a-button-disabled');

			// disable all the other buttons
			$('.a-benefit-button').addClass('a-button-disabled');

			// set ajax data
			let data = {};
			const benefitType = $('input[name="benefit-name"]').val();
			if ('partner-offers' === benefitType) {
				data = {
					action: 'benefit_form_submit',
					minnpost_membership_benefit_form_nonce:
						$button.data('benefit-nonce'),
					current_url: $('input[name="current_url"]').val(),
					'benefit-name': $('input[name="benefit-name"]').val(),
					instance_id: $(
						'[name="instance-id-' + $button.val() + '"]'
					).val(),
					post_id: $button.val(),
					is_ajax: '1',
				};

				$.post(settings.ajaxurl, data, function (response) {
					// success
					if (true === response.success) {
						//console.dir(response);
						$button
							.val(response.data.button_value)
							.text(response.data.button_label)
							.removeClass('a-button-disabled')
							.addClass(response.data.button_class)
							.prop(response.data.button_attr, true);
						$status
							.html(response.data.message)
							.addClass(
								'm-benefit-message-visible ' +
									response.data.message_class
							);
						if (0 < $select.length) {
							$select.prop('disabled', true);
						}
						$('.a-benefit-button')
							.not($button)
							.val(response.data.button_value)
							.attr('disabled', true);
					} else {
						// error
						//console.dir(response);
						if (
							'undefined' ===
							typeof response.data.remove_instance_value
						) {
							if ('' !== response.data.button_label) {
								$button.show();
								$button
									.val(response.data.button_value)
									.text(response.data.button_label)
									.removeClass('a-button-disabled')
									.addClass(response.data.button_class)
									.prop(response.data.button_attr, true);
							} else {
								$button.hide();
							}
						} else {
							$('option', $select).each(function (i) {
								if (
									$(this).val() ===
									response.data.remove_instance_value
								) {
									$(this).remove();
								}
							});
							if ('' !== response.data.button_label) {
								$button.show();
								$button
									.val(response.data.button_value)
									.text(response.data.button_label)
									.removeClass('a-button-disabled')
									.addClass(response.data.button_class)
									.prop(response.data.button_attr, true);
							} else {
								$button.hide();
							}
						}
						// re-enable all the other buttons
						$('.a-benefit-button')
							.not($button)
							.removeClass('a-button-disabled');
						$status
							.html(response.data.message)
							.addClass(
								'm-benefit-message-visible ' +
									response.data.message_class
							);
					}
				});
			}
		});
	}

	$(document).ready(function () {
		if (0 < $('.m-form-membership-benefit').length) {
			benefitForm();
		}
		$('.a-refresh-page').on('click', function (event) {
			event.preventDefault();
			location.reload();
		});
	});
})(jQuery);
