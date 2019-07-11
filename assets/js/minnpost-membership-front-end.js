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

      if ($(options.level_viewer_container).length > 0) {
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
      }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwiY3RhLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImxlbmd0aCIsIm5vdCIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJwYXRobmFtZSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwiZSIsInRhcmdldCIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYmluZCIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwYXJzZUludCIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImZuIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUUsVUFBVUEsQ0FBVixFQUFjO0FBRWYsV0FBU0MsV0FBVCxHQUF1QjtBQUN0QixRQUFLLE1BQU1DLFdBQVcsQ0FBQ0MsVUFBWixDQUF1QkMsSUFBbEMsRUFBeUM7QUFDdENDLE1BQUFBLFFBQVEsQ0FBQ0MsTUFBVCxDQUFpQixJQUFqQjtBQUNGOztBQUNETixJQUFBQSxDQUFDLENBQUUscUNBQUYsQ0FBRCxDQUEyQ08sVUFBM0MsQ0FBdUQsVUFBdkQ7QUFDQVAsSUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUJRLEtBQXpCLENBQWdDLFVBQVVDLEtBQVYsRUFBa0I7QUFDakRBLE1BQUFBLEtBQUssQ0FBQ0MsY0FBTjtBQUNBLFVBQUlDLE9BQU8sR0FBSVgsQ0FBQyxDQUFFLElBQUYsQ0FBaEI7QUFDQSxVQUFJWSxPQUFPLEdBQUlaLENBQUMsQ0FBRSxvQkFBRixFQUF3QkEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVYSxNQUFWLEVBQXhCLENBQWhCO0FBQ0EsVUFBSUMsT0FBTyxHQUFJZCxDQUFDLENBQUUsUUFBRixFQUFZQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVhLE1BQVYsRUFBWixDQUFoQjtBQUNBLFVBQUlFLFFBQVEsR0FBR0MsNEJBQWYsQ0FMaUQsQ0FNakQ7O0FBQ0EsVUFBSyxDQUFFLDRCQUFQLEVBQXNDO0FBQ3JDaEIsUUFBQUEsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJpQixXQUExQixDQUF1QywwRUFBdkM7QUFDQSxPQVRnRCxDQVVqRDs7O0FBQ0FOLE1BQUFB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LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKCAyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUgKSB7XG5cdFx0ICAgbG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHQgICAgICAgICdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0ICAgICAgICAnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHQgICAgICAgICdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHQgICAgICAgICdpc19hamF4JyA6ICcxJyxcblx0XHRcdCAgICB9O1xuXG5cdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQgICAgXHQvLyBzdWNjZXNzXG5cdFx0XHRcdCAgICBpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICBcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHQgICAgXHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Ly8gZXJyb3Jcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHQgICAgXHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0ICAgIFx0XHRcdH1cblx0XHRcdFx0ICAgIFx0XHR9KTtcblx0XHRcdFx0ICAgIFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICB9XG5cblx0XHRcdFx0fSk7XG5cdFx0ICAgIH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdWJtaXRGb3JtKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0XHRzdWJtaXRGb3JtOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQoIGVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKCAnZXZlbnQnLCAnU3VwcG9ydCBVcycsICdCZWNvbWUgQSBNZW1iZXInLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN1Ym1pdEZvcm1cblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
