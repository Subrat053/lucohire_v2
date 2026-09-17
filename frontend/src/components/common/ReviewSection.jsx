import { useEffect, useMemo, useState } from 'react';
import { HiStar } from 'react-icons/hi';
import { reviewAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const StarRow = ({ rating, onChange, readOnly = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((v) => (
      <button
        key={v}
        type="button"
        onClick={() => !readOnly && onChange?.(v)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} p-0.5`}
        disabled={readOnly}
      >
        <HiStar className={`w-5 h-5 ${v <= rating ? 'text-yellow-400' : 'text-gray-200'}`} />
      </button>
    ))}
  </div>
);

const ReviewSection = ({ revieweeId, initialReviews = [], initialSummary = { avgRating: 0, totalReviews: 0 }, leadId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [canReview, setCanReview] = useState(false);
  const [canReviewReason, setCanReviewReason] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editingRating, setEditingRating] = useState(5);
  const [editingComment, setEditingComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const isOwnProfile = useMemo(() => user?._id === revieweeId, [user?._id, revieweeId]);

  useEffect(() => {
    const run = async () => {
      if (!user || isOwnProfile) return;
      try {
        const [{ data: listData }, { data: canData }] = await Promise.all([
          reviewAPI.getByUserId(revieweeId),
          reviewAPI.canReview(revieweeId, leadId),
        ]);

        setReviews(listData.reviews || []);
        setSummary({
          avgRating: listData.avgRating || 0,
          totalReviews: listData.totalReviews || 0,
        });

        setCanReview(Boolean(canData.canReview));
        setCanReviewReason(canData.reason || '');
      } catch {
        // Silent fallback for profile page rendering.
      }
    };

    run();
  }, [user, revieweeId, leadId, isOwnProfile]);

  const isManageable = (review) => {
    const reviewerId = review?.reviewerId?._id || review?.reviewerId;
    if (!user?._id || !reviewerId || String(reviewerId) !== String(user._id)) return false;
    const ageMs = Date.now() - new Date(review.createdAt).getTime();
    return ageMs <= EDIT_WINDOW_MS;
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!canReview) return;

    setSubmitting(true);
    try {
      const { data } = await reviewAPI.create({
        revieweeId,
        rating,
        comment,
        leadId,
      });

      setReviews((prev) => [data.review, ...prev]);
      setSummary(data.ratingSummary || summary);
      setCanReview(false);
      setCanReviewReason('Review already submitted for this interaction');
      setComment('');
      setRating(5);
      toast.success('Review submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (review) => {
    setEditingId(review._id);
    setEditingRating(review.rating || 5);
    setEditingComment(review.comment || '');
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditingRating(5);
    setEditingComment('');
  };

  const saveEdit = async (reviewId) => {
    setSavingEdit(true);
    try {
      const { data } = await reviewAPI.update(reviewId, {
        rating: editingRating,
        comment: editingComment,
      });

      setReviews((prev) => prev.map((r) => (r._id === reviewId ? data.review : r)));
      setSummary(data.ratingSummary || summary);
      cancelEdit();
      toast.success('Review updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update review');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeReview = async (reviewId) => {
    const ok = window.confirm('Delete this review? You can only do this within 24 hours of posting.');
    if (!ok) return;

    setDeletingId(reviewId);
    try {
      const { data } = await reviewAPI.delete(reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      setSummary(data.ratingSummary || summary);
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Reviews</h3>
        <div className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">{summary.avgRating || 0}</span> / 5 · {summary.totalReviews || 0} reviews
        </div>
      </div>

      {canReview && (
        <form onSubmit={submitReview} className="mb-5 p-4 rounded-xl border border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-800 mb-2">Add your review</p>
          <StarRow rating={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience"
            rows={3}
            className="mt-3 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {!canReview && !isOwnProfile && canReviewReason && (
        <p className="text-xs text-gray-500 mb-4">{canReviewReason}</p>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{review.reviewerId?.name || 'User'}</p>
                <StarRow rating={review.rating} readOnly />
              </div>

              {editingId === review._id ? (
                <div className="mt-2">
                  <StarRow rating={editingRating} onChange={setEditingRating} />
                  <textarea
                    value={editingComment}
                    onChange={(e) => setEditingComment(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(review._id)}
                      disabled={savingEdit}
                      className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {review.comment ? <p className="text-sm text-gray-700 mt-1">{review.comment}</p> : null}
                  {isManageable(review) ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(review)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeReview(review._id)}
                        disabled={deletingId === review._id}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === review._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              <p className="text-[11px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewSection;
