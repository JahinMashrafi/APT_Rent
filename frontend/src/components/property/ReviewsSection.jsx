import React from 'react';
import { mockReviews } from '../../data/mockData.js';
import StarRating from '../ui/StarRating.jsx';
import { Star, MessageSquare } from 'lucide-react';
import '../../css/modules.css';
import '../../css/global.css';

export default function ReviewsSection({ propertyId }) {
  const reviews = mockReviews?.filter(r => r.propertyId === propertyId) || [];
  
  return (
    <div style={{ marginTop: '40px' }}>
      <h2 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Star size={24} color="var(--color-brass)" fill="var(--color-brass)" />
        What Tenants Say
      </h2>

      {reviews.length === 0 ? (
        <div className="mod-card-pad" style={{ 
          backgroundColor: 'var(--color-paper-dim)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px', gap: '12px', textAlign: 'center', border: '1px dashed var(--color-line)',
          borderRadius: 'var(--radius-md)'
        }}>
          <MessageSquare size={32} color="var(--color-line-strong)" />
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-line-strong)' }}>
            No reviews yet for this property
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontFamily: 'var(--font-stencil)', fontSize: '2.5rem', color: 'var(--color-ink)', lineHeight: 1 }}>
                4.8
              </div>
              <StarRating rating={4.8} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-line-strong)' }}>
                {reviews.length} reviews
              </div>
            </div>
            
            <div style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[5, 4, 3, 2, 1].map(stars => (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', width: '24px' }}>
                    {stars} <Star size={10} style={{ display: 'inline' }} />
                  </div>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-line)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      backgroundColor: 'var(--color-brass)', 
                      width: stars === 5 ? '80%' : stars === 4 ? '15%' : '0%',
                      borderRadius: 'var(--radius-pill)'
                    }}></div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-line-strong)', width: '20px', textAlign: 'right' }}>
                    {stars === 5 ? reviews.length : 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(review => (
              <div key={review.id} className="review-card" style={{ padding: '16px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div className="review-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-paper-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {review.author?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>
                      {review.author}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-line-strong)' }}>
                      {new Date(review.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
