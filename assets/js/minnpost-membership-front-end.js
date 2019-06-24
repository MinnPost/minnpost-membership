"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
  });
  $('.a-refresh-page').click(function (event) {
    event.preventDefault();
    location.reload();
  });
})(jQuery);
"use strict";

(function ($) {
  function mp_membership_analytics_tracking_event(type, category, action, label, value) {
    if (typeof ga !== 'undefined') {
      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
      } else {
        ga('send', type, category, action, label, value);
      }
    } else {
      return;
    }
  }

  $(document).ready(function () {
    $('.m-support-cta-top .a-support-button').click(function (event) {
      var value = '';

      if ($('svg', $(this)).length > 0) {
        value = $('svg', $(this)).attr('title') + ' ';
      }

      value = value + $(this).text();
      mp_membership_analytics_tracking_event('event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
    });
  });
})(jQuery);
"use strict";

// plugin
;

(function ($, window, document, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_selector_standalone': '#amount-item #amount',
    'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
    'level_viewer_container': '.a-show-level',
    'level_name': '.a-level',
    'user_current_level': '.a-current-level',
    'user_new_level': '.a-new-level',
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
      this.submitForm(this.element, this.options);
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga !== 'undefined') {
        if (typeof value === 'undefined') {
          ga('send', type, category, action, label);
        } else {
          ga('send', type, category, action, label, value);
        }
      } else {
        return;
      }
    },
    // end analyticsEventTrack
    catchHashLinks: function catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var previous_amount = '';
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if (typeof minnpost_membership_data !== 'undefined' && $(options.user_current_level).length > 0) {
        previous_amount = minnpost_membership_data.current_user.previous_amount;
      }

      if ($(options.amount_selector_standalone).length > 0) {
        amount = $(options.amount_selector_standalone).val();
        frequency_string = $(options.frequency_selector_standalone + ':checked').val();
        frequency = frequency_string.split(' - ')[1];
        frequency_name = frequency_string.split(' - ')[0];
        level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
        that.showNewLevel(element, options, level);
        $(options.frequency_selector_standalone).change(function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];
          level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
          that.showNewLevel(element, options, level);
        });
        $(options.amount_selector_standalone).bind('keyup mouseup', function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if ($(this).data('last-value') != $(this).val()) {
            $(this).data('last-value', $(this).val());
            level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
            that.showNewLevel(element, options, level);
          }

          ;
        });
      }

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
      var thisyear = parseInt(amount) * parseInt(frequency);
      var level = '';

      if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
        var prior_year_amount = parseInt(previous_amount.prior_year_contributions);
        var coming_year_amount = parseInt(previous_amount.coming_year_contributions);
        var annual_recurring_amount = parseInt(previous_amount.annual_recurring_amount); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      level = this.getLevel(thisyear);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = [];

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    },
    // end getLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      $(options.level_viewer_container).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

      if ($(options.user_current_level).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
        if ('a', $(options.level_viewer_container).length > 0) {
          level_viewer_container_selector = options.level_viewer_container + ' a';
        }

        old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

        if (old_level !== level['name'].toLowerCase()) {
          $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('changed')));
        } else {
          $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('not-changed')));
        }
      }

      $(options.level_name, options.level_viewer_container).text(level['name']);
    },
    // end showNewLevel
    changeFrequency: function changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function startLevelClick(element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    },
    // end startLevelClick
    submitForm: function submitForm(element, options) {
      var that = this;
      $(element).submit(function (event) {
        that.analyticsEventTrack('event', 'Support Us', 'Become A Member', location.pathname);
      });
    } // end submitForm

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwiY3RhLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImxlbmd0aCIsIm5vdCIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJwYXRobmFtZSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwiZSIsInRhcmdldCIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYmluZCIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwYXJzZUludCIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImZuIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUUsVUFBVUEsQ0FBVixFQUFjO0FBRWYsV0FBU0MsV0FBVCxHQUF1QjtBQUN0QixRQUFLLE1BQU1DLFdBQVcsQ0FBQ0MsVUFBWixDQUF1QkMsSUFBbEMsRUFBeUM7QUFDdENDLE1BQUFBLFFBQVEsQ0FBQ0MsTUFBVCxDQUFpQixJQUFqQjtBQUNGOztBQUNETixJQUFBQSxDQUFDLENBQUUscUNBQUYsQ0FBRCxDQUEyQ08sVUFBM0MsQ0FBdUQsVUFBdkQ7QUFDQVAsSUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUJRLEtBQXpCLENBQWdDLFVBQVVDLEtBQVYsRUFBa0I7QUFDakRBLE1BQUFBLEtBQUssQ0FBQ0MsY0FBTjtBQUNBLFVBQUlDLE9BQU8sR0FBSVgsQ0FBQyxDQUFFLElBQUYsQ0FBaEI7QUFDQSxVQUFJWSxPQUFPLEdBQUlaLENBQUMsQ0FBRSxvQkFBRixFQUF3QkEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVYSxNQUFWLEVBQXhCLENBQWhCO0FBQ0EsVUFBSUMsT0FBTyxHQUFJZCxDQUFDLENBQUUsUUFBRixFQUFZQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVhLE1BQVYsRUFBWixDQUFoQjtBQUNBLFVBQUlFLFFBQVEsR0FBR0MsNEJBQWYsQ0FMaUQsQ0FNakQ7O0FBQ0EsVUFBSyxDQUFFLDRCQUFQLEVBQXNDO0FBQ3JDaEIsUUFBQUEsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJpQixXQUExQixDQUF1QywwRUFBdkM7QUFDQSxPQVRnRCxDQVVqRDs7O0FBQ0FOLE1BQUFB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dUNwQixZQUF2QyxHQUFzRCxHQUF0RCxHQUE0RDFCLE9BQU8sQ0FBQ3lDLDZCQUF0RSxDQUFELENBQXVHbEYsUUFBdkcsQ0FBaUgsU0FBakg7QUFDRCxPQVBIO0FBUUEsS0E5UmlCO0FBOFJmO0FBRUhvRCxJQUFBQSxVQUFVLEVBQUUsb0JBQVVaLE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQ3hDLFVBQUl1QixJQUFJLEdBQUcsSUFBWDtBQUNBbkYsTUFBQUEsQ0FBQyxDQUFFMkQsT0FBRixDQUFELENBQWFvRixNQUFiLENBQXFCLFVBQVV0SSxLQUFWLEVBQWtCO0FBQ3RDMEUsUUFBQUEsSUFBSSxDQUFDWCxtQkFBTCxDQUEwQixPQUExQixFQUFtQyxZQUFuQyxFQUFpRCxpQkFBakQsRUFBb0VuRSxRQUFRLENBQUNnRCxRQUE3RTtBQUNBLE9BRkQ7QUFHQSxLQXJTaUIsQ0FxU2Y7O0FBclNlLEdBQW5CLENBekM2QyxDQWdWMUM7QUFFSDtBQUNBOztBQUNBckQsRUFBQUEsQ0FBQyxDQUFDZ0osRUFBRixDQUFLeEYsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBS25CLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXpDLENBQUMsQ0FBQ29CLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWW9DLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0N4RCxRQUFBQSxDQUFDLENBQUNvQixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVlvQyxVQUExQixFQUFzQyxJQUFJRSxNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFRQSxDQTVWQSxFQTRWR2QsTUE1VkgsRUE0VldRLE1BNVZYLEVBNFZtQlYsUUE1Vm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHQgICBsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHQgICAgZGF0YSA9IHtcblx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHQgICAgICAgICdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0ICAgICAgICAnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdCAgICAgICAgJ2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0ICAgIH07XG5cblx0XHRcdCAgICAkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCAgICBcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0ICAgIGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdCAgICBcdFx0JHNlbGVjdC5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHQvLyBlcnJvclxuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdCAgICBcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdGlmICggJCggdGhpcyApLnZhbCgpID09PSByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHQgICAgXHRcdFx0fVxuXHRcdFx0XHQgICAgXHRcdH0pO1xuXHRcdFx0XHQgICAgXHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIH1cblxuXHRcdFx0XHR9KTtcblx0XHQgICAgfVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN1Ym1pdEZvcm0oIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdFx0c3VibWl0Rm9ybTogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKCBlbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayggJ2V2ZW50JywgJ1N1cHBvcnQgVXMnLCAnQmVjb21lIEEgTWVtYmVyJywgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdWJtaXRGb3JtXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
