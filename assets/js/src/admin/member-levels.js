(function($){

	function showMemberLevelFields() {
		var $toggle = $('#minnpost_membership_use_member_levels');
		// Toggle the field type
		$toggle.on('click', function(e) {
			var checkbox = $(this);
			if (checkbox.is(':checked')) {
				$('.minnpost-membership-member-levels').show();
				$('.minnpost-member-field.minnpost_membership_frequency_options, .minnpost-member-field.minnpost_membership_default_frequency').show();
			} else {
				$('.minnpost-membership-member-levels').hide();
				$('.minnpost-member-field.minnpost_membership_frequency_options, .minnpost-member-field.minnpost_membership_default_frequency').hide();
			}
		});
	}

	function toggleMembershipChangeFields() {
		var $toggle = $('#minnpost_membership_support_post_form_change_for_members');
		var fields = '.minnpost_membership_support_post_form_nochange, .minnpost_membership_support_post_form_change';
		if ($toggle.is(':checked')) {
			$(fields).show();
		} else {
			$(fields).hide();
		}
		$toggle.on('click', function(e) {
			var checkbox = $(this);
			if (checkbox.is(':checked')) {
				$(fields).show();
			} else {
				$(fields).hide();
			}
		});
	}

	function toggleBenefitActionFields() {
		var $toggle = $('input[name="minnpost_membership_support-partner-offers-user_state[]"]');

		$($toggle).each(function() {
			$( '.minnpost_membership_support-partner-offers_action_title_' + $(this).val() + ', .minnpost_membership_support-partner-offers_action_body_' + $(this).val() ).hide();
	    });

		if ($toggle.is(':checked')) {
			$( '.minnpost_membership_support-partner-offers_action_title_' + $('input[name="minnpost_membership_support-partner-offers-user_state[]"]:checked').val() + ', .minnpost_membership_support-partner-offers_action_body_' + $('input[name="minnpost_membership_support-partner-offers-user_state[]"]:checked').val() ).show();
		}
		$toggle.on('click', function(e) {
			var checkbox = $(this);

			$($toggle).each(function() {
				$( '.minnpost_membership_support-partner-offers_action_title_' + $(this).val() + ', .minnpost_membership_support-partner-offers_action_body_' + $(this).val() ).hide();
		    });

			if (checkbox.is(':checked')) {
				$( '.minnpost_membership_support-partner-offers_action_title_' + $(this).val() + ', .minnpost_membership_support-partner-offers_action_body_' + $(this).val() ).show();
			}
		});
	}

	$(document).ready(function() {

		// show or hide member level fields
		if ($('.minnpost_membership_use_member_levels').length > 0 ) {
			showMemberLevelFields();
		}

		if ( $('.minnpost_membership_support_post_form_change_for_members').length > 0 ) {
			toggleMembershipChangeFields();
		}

		if ( $('.minnpost_membership_support-partner-offers-user_state').length > 0 ) {
			toggleBenefitActionFields();
		}

		$('.minnpost-membership-general-settings').minnpostMembership({
			'amount_viewer' : '.amount h5',
			'frequency_selector_in_levels' : 'input[name="minnpost_membership_default_frequency[]"]',
			'frequency_selector_in_levels_type' : 'radio',
			'levels_container' : '.minnpost-membership-member-levels',
			'single_level_container' : '.minnpost-membership-member-level',
			'single_level_summary_selector' : '.member-level-brief',
			'flipped_items' : 'div.amount, div.enter',
			'level_frequency_text_selector' : '.show-frequency',
		});

	});

})(jQuery);
