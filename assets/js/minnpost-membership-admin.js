"use strict";

(function ($) {
  function clearDateTimeFields() {
    if ($('.cmb-type-text-datetime-timestamp').length > 0) {
      $('.cmb2-timepicker').after('<button type="button" class="button button-secondary clear-datetime">Clear Date &amp; Time</button>');
    }

    $('.clear-datetime').click(function () {
      var parent = $(this).parent();
      $('input', parent).val('');
    });
  }

  $(document).ready(function () {
    clearDateTimeFields();

    if ($('.minnpost-member-field-display-item-toggle').length > 0) {
      toggleActionFields('.minnpost-member-field-display-item-toggle');
    }
  });
})(jQuery);
"use strict";

(function ($) {
  function showMemberLevelFields() {
    var $toggle = $('#minnpost_membership_use_member_levels'); // Toggle the field type

    $toggle.on('click', function (e) {
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

    $toggle.on('click', function (e) {
      var checkbox = $(this);

      if (checkbox.is(':checked')) {
        $(fields).show();
      } else {
        $(fields).hide();
      }
    });
  }

  $(document).ready(function () {
    // show or hide member level fields
    if ($('.minnpost_membership_use_member_levels').length > 0) {
      showMemberLevelFields();
    }

    if ($('.minnpost_membership_support_post_form_change_for_members').length > 0) {
      toggleMembershipChangeFields();
    }

    if ($('.minnpost-member-field-user-state-toggle').length > 0) {
      toggleActionFields('.minnpost-member-field-user-state-toggle');
    }

    $('.minnpost-membership-general-settings').minnpostMembership({
      'amount_viewer': '.amount h5',
      'frequency_selector_in_levels': 'input[name="minnpost_membership_default_frequency[]"]',
      'frequency_selector_in_levels_type': 'radio',
      'levels_container': '.minnpost-membership-member-levels',
      'single_level_container': '.minnpost-membership-member-level',
      'single_level_summary_selector': '.member-level-brief',
      'flipped_items': 'div.amount, div.enter',
      'level_frequency_text_selector': '.show-frequency'
    });
  });
})(jQuery);
"use strict";

function toggleActionFields(parent) {
  $('td', parent).attr('colspan', '2');
  $('th', parent).hide();
  $('.checkbox', parent).wrapAll('<div class="checkbox-tab-wrap">');
  var $toggle = $('input[type="radio"]', $(parent));
  $($toggle).each(function () {
    $('.minnpost-member-field-' + $(this).val()).wrapAll('<tr class="minnpost-member-fields-wrap minnpost-member-fields-wrap-' + $(this).val() + '"><td colspan="2"><table />');
    $('.minnpost-member-fields-wrap').hide();
  });

  if ($toggle.is(':checked')) {
    $('.minnpost-member-fields-wrap-' + $('input[type="radio"]:checked', $(parent)).val()).show();
  }

  $toggle.on('click', function (e) {
    var checkbox = $(this);
    $('.minnpost-member-fields-wrap').hide();

    if (checkbox.is(':checked')) {
      $('.minnpost-member-fields-wrap-' + $(this).val()).show();
    }
  });
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyIsInNoYXJlZC5qcyJdLCJuYW1lcyI6WyIkIiwiY2xlYXJEYXRlVGltZUZpZWxkcyIsImxlbmd0aCIsImFmdGVyIiwiY2xpY2siLCJwYXJlbnQiLCJ2YWwiLCJkb2N1bWVudCIsInJlYWR5IiwidG9nZ2xlQWN0aW9uRmllbGRzIiwialF1ZXJ5Iiwic2hvd01lbWJlckxldmVsRmllbGRzIiwiJHRvZ2dsZSIsIm9uIiwiZSIsImNoZWNrYm94IiwiaXMiLCJzaG93IiwiaGlkZSIsInRvZ2dsZU1lbWJlcnNoaXBDaGFuZ2VGaWVsZHMiLCJmaWVsZHMiLCJtaW5ucG9zdE1lbWJlcnNoaXAiLCJhdHRyIiwid3JhcEFsbCIsImVhY2giXSwibWFwcGluZ3MiOiI7O0FBQUEsQ0FBRSxVQUFVQSxDQUFWLEVBQWM7QUFFZixXQUFTQyxtQkFBVCxHQUErQjtBQUM5QixRQUFLRCxDQUFDLENBQUUsbUNBQUYsQ0FBRCxDQUF5Q0UsTUFBekMsR0FBa0QsQ0FBdkQsRUFBMkQ7QUFDMURGLE1BQUFBLENBQUMsQ0FBRSxrQkFBRixDQUFELENBQXdCRyxLQUF4QixDQUErQixxR0FBL0I7QUFDQTs7QUFFREgsSUFBQUEsQ0FBQyxDQUFFLGlCQUFGLENBQUQsQ0FBdUJJLEtBQXZCLENBQThCLFlBQVc7QUFDeEMsVUFBSUMsTUFBTSxHQUFHTCxDQUFDLENBQUUsSUFBRixDQUFELENBQVVLLE1BQVYsRUFBYjtBQUNBTCxNQUFBQSxDQUFDLENBQUUsT0FBRixFQUFXSyxNQUFYLENBQUQsQ0FBcUJDLEdBQXJCLENBQTBCLEVBQTFCO0FBQ0EsS0FIRDtBQUlBOztBQUVETixFQUFBQSxDQUFDLENBQUVPLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFDL0JQLElBQUFBLG1CQUFtQjs7QUFDbkIsUUFBSUQsQ0FBQyxDQUFDLDRDQUFELENBQUQsQ0FBZ0RFLE1BQWhELEdBQXlELENBQTdELEVBQWdFO0FBQy9ETyxNQUFBQSxr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LENBQUQsQ0FBUU0sR0FBUixFQUFwQyxDQUFELENBQXFEVyxJQUFyRDtBQUNBO0FBQ0QsR0FSRDtBQVNBIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGNsZWFyRGF0ZVRpbWVGaWVsZHMoKSB7XG5cdFx0aWYgKCAkKCAnLmNtYi10eXBlLXRleHQtZGF0ZXRpbWUtdGltZXN0YW1wJyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHQkKCAnLmNtYjItdGltZXBpY2tlcicgKS5hZnRlciggJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uIGJ1dHRvbi1zZWNvbmRhcnkgY2xlYXItZGF0ZXRpbWVcIj5DbGVhciBEYXRlICZhbXA7IFRpbWU8L2J1dHRvbj4nICk7XG5cdFx0fVxuXG5cdFx0JCggJy5jbGVhci1kYXRldGltZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcGFyZW50ID0gJCggdGhpcyApLnBhcmVudCgpO1xuXHRcdFx0JCggJ2lucHV0JywgcGFyZW50ICkudmFsKCAnJyApO1xuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0Y2xlYXJEYXRlVGltZUZpZWxkcygpO1xuXHRcdGlmICgkKCcubWlubnBvc3QtbWVtYmVyLWZpZWxkLWRpc3BsYXktaXRlbS10b2dnbGUnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHR0b2dnbGVBY3Rpb25GaWVsZHMoJy5taW5ucG9zdC1tZW1iZXItZmllbGQtZGlzcGxheS1pdGVtLXRvZ2dsZScpO1xuXHRcdH1cblx0fSk7XG5cbn0pKGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24oJCl7XG5cblx0ZnVuY3Rpb24gc2hvd01lbWJlckxldmVsRmllbGRzKCkge1xuXHRcdHZhciAkdG9nZ2xlID0gJCgnI21pbm5wb3N0X21lbWJlcnNoaXBfdXNlX21lbWJlcl9sZXZlbHMnKTtcblx0XHQvLyBUb2dnbGUgdGhlIGZpZWxkIHR5cGVcblx0XHQkdG9nZ2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBjaGVja2JveCA9ICQodGhpcyk7XG5cdFx0XHRpZiAoY2hlY2tib3guaXMoJzpjaGVja2VkJykpIHtcblx0XHRcdFx0JCgnLm1pbm5wb3N0LW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycpLnNob3coKTtcblx0XHRcdFx0JCgnLm1pbm5wb3N0LW1lbWJlci1maWVsZC5taW5ucG9zdF9tZW1iZXJzaGlwX2ZyZXF1ZW5jeV9vcHRpb25zLCAubWlubnBvc3QtbWVtYmVyLWZpZWxkLm1pbm5wb3N0X21lbWJlcnNoaXBfZGVmYXVsdF9mcmVxdWVuY3knKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCcubWlubnBvc3QtbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJykuaGlkZSgpO1xuXHRcdFx0XHQkKCcubWlubnBvc3QtbWVtYmVyLWZpZWxkLm1pbm5wb3N0X21lbWJlcnNoaXBfZnJlcXVlbmN5X29wdGlvbnMsIC5taW5ucG9zdC1tZW1iZXItZmllbGQubWlubnBvc3RfbWVtYmVyc2hpcF9kZWZhdWx0X2ZyZXF1ZW5jeScpLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvZ2dsZU1lbWJlcnNoaXBDaGFuZ2VGaWVsZHMoKSB7XG5cdFx0dmFyICR0b2dnbGUgPSAkKCcjbWlubnBvc3RfbWVtYmVyc2hpcF9zdXBwb3J0X3Bvc3RfZm9ybV9jaGFuZ2VfZm9yX21lbWJlcnMnKTtcblx0XHR2YXIgZmllbGRzID0gJy5taW5ucG9zdF9tZW1iZXJzaGlwX3N1cHBvcnRfcG9zdF9mb3JtX25vY2hhbmdlLCAubWlubnBvc3RfbWVtYmVyc2hpcF9zdXBwb3J0X3Bvc3RfZm9ybV9jaGFuZ2UnO1xuXHRcdGlmICgkdG9nZ2xlLmlzKCc6Y2hlY2tlZCcpKSB7XG5cdFx0XHQkKGZpZWxkcykuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKGZpZWxkcykuaGlkZSgpO1xuXHRcdH1cblx0XHQkdG9nZ2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBjaGVja2JveCA9ICQodGhpcyk7XG5cdFx0XHRpZiAoY2hlY2tib3guaXMoJzpjaGVja2VkJykpIHtcblx0XHRcdFx0JChmaWVsZHMpLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoZmllbGRzKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuXHRcdC8vIHNob3cgb3IgaGlkZSBtZW1iZXIgbGV2ZWwgZmllbGRzXG5cdFx0aWYgKCQoJy5taW5ucG9zdF9tZW1iZXJzaGlwX3VzZV9tZW1iZXJfbGV2ZWxzJykubGVuZ3RoID4gMCApIHtcblx0XHRcdHNob3dNZW1iZXJMZXZlbEZpZWxkcygpO1xuXHRcdH1cblxuXHRcdGlmICggJCgnLm1pbm5wb3N0X21lbWJlcnNoaXBfc3VwcG9ydF9wb3N0X2Zvcm1fY2hhbmdlX2Zvcl9tZW1iZXJzJykubGVuZ3RoID4gMCApIHtcblx0XHRcdHRvZ2dsZU1lbWJlcnNoaXBDaGFuZ2VGaWVsZHMoKTtcblx0XHR9XG5cblx0XHRpZiAoICQoJy5taW5ucG9zdC1tZW1iZXItZmllbGQtdXNlci1zdGF0ZS10b2dnbGUnKS5sZW5ndGggPiAwICkge1xuXHRcdFx0dG9nZ2xlQWN0aW9uRmllbGRzKCAnLm1pbm5wb3N0LW1lbWJlci1maWVsZC11c2VyLXN0YXRlLXRvZ2dsZScgKTtcblx0XHR9XG5cblx0XHQkKCcubWlubnBvc3QtbWVtYmVyc2hpcC1nZW5lcmFsLXNldHRpbmdzJykubWlubnBvc3RNZW1iZXJzaGlwKHtcblx0XHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGg1Jyxcblx0XHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICdpbnB1dFtuYW1lPVwibWlubnBvc3RfbWVtYmVyc2hpcF9kZWZhdWx0X2ZyZXF1ZW5jeVtdXCJdJyxcblx0XHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3JhZGlvJyxcblx0XHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcubWlubnBvc3QtbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubWlubnBvc3QtbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdH0pO1xuXG5cdH0pO1xuXG59KShqUXVlcnkpO1xuIiwiZnVuY3Rpb24gdG9nZ2xlQWN0aW9uRmllbGRzKCBwYXJlbnQgKSB7XG5cblx0JCggJ3RkJywgcGFyZW50ICkuYXR0cignY29sc3BhbicsICcyJyApO1xuXHQkKCAndGgnLCBwYXJlbnQgKS5oaWRlKCk7XG5cdCQoICcuY2hlY2tib3gnLCBwYXJlbnQgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImNoZWNrYm94LXRhYi13cmFwXCI+JyApO1xuXG5cdHZhciAkdG9nZ2xlID0gJCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJywgJChwYXJlbnQpICk7XG5cblx0JCgkdG9nZ2xlKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdCQoICcubWlubnBvc3QtbWVtYmVyLWZpZWxkLScgKyAkKHRoaXMpLnZhbCgpICkud3JhcEFsbCggJzx0ciBjbGFzcz1cIm1pbm5wb3N0LW1lbWJlci1maWVsZHMtd3JhcCBtaW5ucG9zdC1tZW1iZXItZmllbGRzLXdyYXAtJyArICQodGhpcykudmFsKCkgKyAnXCI+PHRkIGNvbHNwYW49XCIyXCI+PHRhYmxlIC8+Jyk7XG5cdFx0JCggJy5taW5ucG9zdC1tZW1iZXItZmllbGRzLXdyYXAnICkuaGlkZSgpO1xuICAgIH0pO1xuXG5cdGlmICgkdG9nZ2xlLmlzKCc6Y2hlY2tlZCcpKSB7XG5cdFx0JCggJy5taW5ucG9zdC1tZW1iZXItZmllbGRzLXdyYXAtJyArICQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXTpjaGVja2VkJywgJChwYXJlbnQpICkudmFsKCkgKS5zaG93KCk7XG5cdH1cblx0JHRvZ2dsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIGNoZWNrYm94ID0gJCh0aGlzKTtcblxuXHRcdCQoICcubWlubnBvc3QtbWVtYmVyLWZpZWxkcy13cmFwJyApLmhpZGUoKTtcblxuXHRcdGlmIChjaGVja2JveC5pcygnOmNoZWNrZWQnKSkge1xuXHRcdFx0JCggJy5taW5ucG9zdC1tZW1iZXItZmllbGRzLXdyYXAtJyArICQodGhpcykudmFsKCkgKS5zaG93KCk7XG5cdFx0fVxuXHR9KTtcbn1cbiJdfQ==
